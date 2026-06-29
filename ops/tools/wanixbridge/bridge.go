package main

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	defaultListen     = "0.0.0.0:7654"
	defaultHostPath   = "/host"
	defaultMaxSession = 9
	hostWaitTimeout   = 30 * time.Second
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type session struct {
	id   string
	conn *websocket.Conn
	send chan []byte
	done chan struct{}
}

type hostoutbound struct {
	text bool
	data []byte
}

type bridge struct {
	token       string
	hostpath    string
	maxsessions int

	mu       sync.Mutex
	host     *websocket.Conn
	hostsend chan hostoutbound
	hostdone chan struct{}
	sessions map[string]*session
}

func newbridge(token, hostpath string, maxsessions int) *bridge {
	return &bridge{
		token:       token,
		hostpath:    hostpath,
		maxsessions: maxsessions,
		sessions:    make(map[string]*session),
	}
}

func (b *bridge) validtoken(r *http.Request) bool {
	q := r.URL.Query().Get("token")
	if q == b.token {
		return true
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") && strings.TrimPrefix(auth, "Bearer ") == b.token {
		return true
	}
	return false
}

func (b *bridge) handlehost(w http.ResponseWriter, r *http.Request) {
	if !websocket.IsWebSocketUpgrade(r) {
		http.Error(w, "websocket upgrade required", http.StatusBadRequest)
		return
	}
	if !b.validtoken(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("host upgrade:", err)
		return
	}
	log.Println("host connected")

	b.mu.Lock()
	if b.host != nil {
		b.host.Close()
	}
	b.host = ws
	b.hostsend = make(chan hostoutbound, 64)
	b.hostdone = make(chan struct{})
	hostsend := b.hostsend
	hostdone := b.hostdone
	b.mu.Unlock()

	go b.readhost(ws, hostdone)

	for {
		select {
		case <-hostdone:
			return
		case msg := <-hostsend:
			var err error
			if msg.text {
				err = ws.WriteMessage(websocket.TextMessage, msg.data)
			} else {
				err = ws.WriteMessage(websocket.BinaryMessage, msg.data)
			}
			if err != nil {
				log.Println("host write:", err)
				b.clearhost(ws)
				return
			}
		}
	}
}

func (b *bridge) readhost(ws *websocket.Conn, done chan struct{}) {
	defer close(done)
	for {
		typ, buf, err := ws.ReadMessage()
		if err != nil {
			log.Println("host read:", err)
			b.clearhost(ws)
			return
		}
		if typ == websocket.TextMessage {
			continue
		}
		if typ != websocket.BinaryMessage {
			continue
		}
		sessionid, payload, err := decodemuxframe(buf)
		if err != nil {
			log.Println("host mux decode:", err)
			continue
		}
		b.mu.Lock()
		sess := b.sessions[sessionid]
		b.mu.Unlock()
		if sess == nil {
			continue
		}
		select {
		case sess.send <- payload:
		case <-sess.done:
		default:
			log.Println("session send buffer full:", sessionid)
		}
	}
}

func (b *bridge) clearhost(ws *websocket.Conn) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.host != ws {
		return
	}
	b.host = nil
	for id, sess := range b.sessions {
		close(sess.done)
		sess.conn.Close()
		delete(b.sessions, id)
	}
}

func (b *bridge) waitforhost() error {
	deadline := time.Now().Add(hostWaitTimeout)
	for time.Now().Before(deadline) {
		b.mu.Lock()
		ok := b.host != nil
		b.mu.Unlock()
		if ok {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return errors.New("host not connected")
}

func (b *bridge) handleclient(w http.ResponseWriter, r *http.Request) {
	if !websocket.IsWebSocketUpgrade(r) {
		http.Error(w, "websocket upgrade required", http.StatusBadRequest)
		return
	}
	if !b.validtoken(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	b.mu.Lock()
	if len(b.sessions) >= b.maxsessions {
		b.mu.Unlock()
		http.Error(w, "session cap reached", http.StatusServiceUnavailable)
		return
	}
	b.mu.Unlock()

	if err := b.waitforhost(); err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("client upgrade:", err)
		return
	}

	sessionid, err := newsessionid()
	if err != nil {
		log.Println("session id:", err)
		ws.Close()
		return
	}

	sess := &session{
		id:   sessionid,
		conn: ws,
		send: make(chan []byte, 32),
		done: make(chan struct{}),
	}

	b.mu.Lock()
	b.sessions[sessionid] = sess
	hostsend := b.hostsend
	b.mu.Unlock()

	if err := b.sendhostcontrol(hostsend, "new-session", sessionid); err != nil {
		log.Println("new-session:", err)
		b.removesession(sessionid)
		ws.Close()
		return
	}

	log.Println("client session started:", sessionid)
	go b.pumpclienttoserver(sess)
	b.pumpservertoclient(sess)
}

func (b *bridge) sendhostcontrol(hostsend chan hostoutbound, typ, id string) error {
	if hostsend == nil {
		return errors.New("host not connected")
	}
	msg, err := encodecontrol(typ, id)
	if err != nil {
		return err
	}
	select {
	case hostsend <- hostoutbound{text: true, data: msg}:
		return nil
	default:
		return errors.New("host send buffer full")
	}
}

func (b *bridge) pumpclienttoserver(sess *session) {
	defer b.removesession(sess.id)
	for {
		typ, buf, err := sess.conn.ReadMessage()
		if err != nil {
			return
		}
		if typ != websocket.BinaryMessage {
			continue
		}
		frame, err := encodemuxframe(sess.id, buf)
		if err != nil {
			log.Println("client mux encode:", err)
			return
		}
		b.mu.Lock()
		hostsend := b.hostsend
		b.mu.Unlock()
		if hostsend == nil {
			return
		}
		select {
		case hostsend <- hostoutbound{text: false, data: frame}:
		case <-sess.done:
			return
		}
	}
}

func (b *bridge) pumpservertoclient(sess *session) {
	defer sess.conn.Close()
	for {
		select {
		case <-sess.done:
			return
		case buf, ok := <-sess.send:
			if !ok {
				return
			}
			if err := sess.conn.WriteMessage(websocket.BinaryMessage, buf); err != nil {
				return
			}
		}
	}
}

func (b *bridge) removesession(id string) {
	b.mu.Lock()
	sess, ok := b.sessions[id]
	if ok {
		delete(b.sessions, id)
	}
	hostsend := b.hostsend
	b.mu.Unlock()
	if !ok {
		return
	}
	select {
	case <-sess.done:
	default:
		close(sess.done)
	}
	_ = b.sendhostcontrol(hostsend, "close-session", id)
	log.Println("client session ended:", id)
}

func newsessionid() (string, error) {
	var raw [8]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw[:]), nil
}

func picklanhost(port string) string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "127.0.0.1"
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue
			}
			return ip.String()
		}
	}
	return "127.0.0.1"
}

func splitport(listen string) (host, port string) {
	h, p, err := net.SplitHostPort(listen)
	if err != nil {
		return "0.0.0.0", "7654"
	}
	if h == "" {
		h = "0.0.0.0"
	}
	return h, p
}
