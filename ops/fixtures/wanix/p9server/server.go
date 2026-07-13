//go:build !js && !wasm

package p9server

import (
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/websocket"
	"github.com/hugelgupf/p9/p9"
	"tractor.dev/wanix/fs/localfs"
	"tractor.dev/wanix/fs/p9kit"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// DefaultPort is the stable listen port for ops:fixtures:wanix:p9server:dev.
// Tests may pass Port: 0 for an ephemeral port.
const DefaultPort = 8765

// Options configures Start (TLS required — wss:// only).
type Options struct {
	// CertFile + KeyFile — same pair cafe:dev uses via mkcert.
	CertFile string
	KeyFile  string
	// Port is 127.0.0.1 listen port. 0 = ephemeral (tests).
	Port int
}

// Server serves a directory over wss:// 9P (wanix import compatible).
type Server struct {
	httpServer *http.Server
	listener   net.Listener
	RootDir    string
	URL        string // wss://localhost:<port>/
}

// Start listens on 127.0.0.1:<Port> (or ephemeral when Port==0) and serves rootdir via wss→9P.
func Start(rootdir string, opts Options) (*Server, error) {
	if opts.CertFile == "" || opts.KeyFile == "" {
		return nil, fmt.Errorf("p9server: TLS cert and key required (wss only)")
	}
	if _, err := os.Stat(opts.CertFile); err != nil {
		return nil, fmt.Errorf("p9server cert: %w", err)
	}
	if _, err := os.Stat(opts.KeyFile); err != nil {
		return nil, fmt.Errorf("p9server key: %w", err)
	}

	abs, err := filepath.Abs(rootdir)
	if err != nil {
		return nil, err
	}
	dirfs, err := localfs.New(abs)
	if err != nil {
		return nil, err
	}
	p9srv := p9.NewServer(p9kit.Attacher(dirfs, p9kit.WithXattrAttrStore()))

	addr := "127.0.0.1:0"
	if opts.Port > 0 {
		addr = fmt.Sprintf("127.0.0.1:%d", opts.Port)
	}
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("p9server listen %s: %w", addr, err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if websocket.IsWebSocketUpgrade(r) {
			handlep9(p9srv, w, r)
			return
		}
		log.Printf("p9server: non-websocket %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		http.Error(w, "expecting websocket upgrade", http.StatusBadRequest)
	})
	hs := &http.Server{Handler: mux}

	cert, err := tls.LoadX509KeyPair(opts.CertFile, opts.KeyFile)
	if err != nil {
		_ = ln.Close()
		return nil, fmt.Errorf("p9server tls load: %w", err)
	}
	tlsconfig := &tls.Config{Certificates: []tls.Certificate{cert}}
	serveLN := tls.NewListener(ln, tlsconfig)

	// Prefer localhost in the printed URL so it matches mkcert SAN (DNS:localhost).
	_, port, err := net.SplitHostPort(ln.Addr().String())
	if err != nil {
		_ = ln.Close()
		return nil, err
	}
	s := &Server{
		httpServer: hs,
		listener:   ln,
		RootDir:    abs,
		URL:        fmt.Sprintf("wss://localhost:%s/", port),
	}
	go func() {
		if err := hs.Serve(serveLN); err != nil && err != http.ErrServerClosed {
			log.Println("p9server:", err)
		}
	}()
	return s, nil
}

// Close shuts down the HTTP server.
func (s *Server) Close() error {
	if s.httpServer == nil {
		return nil
	}
	return s.httpServer.Close()
}

func handlep9(srv *p9.Server, w http.ResponseWriter, r *http.Request) {
	remote := r.RemoteAddr
	log.Printf("p9server: new connection from %s", remote)
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("p9server: upgrade failed from %s: %v", remote, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer func() {
		log.Printf("p9server: connection closed from %s", remote)
		_ = ws.Close()
	}()

	inR, inW := io.Pipe()
	outR, outW := io.Pipe()

	go func() {
		for {
			typ, buf, err := ws.ReadMessage()
			if err != nil {
				_ = inW.Close()
				break
			}
			if typ != websocket.BinaryMessage {
				continue
			}
			if _, err := inW.Write(buf); err != nil {
				break
			}
		}
	}()

	go func() {
		for {
			sizeBuf := make([]byte, 4)
			_, err := io.ReadFull(outR, sizeBuf)
			if err != nil {
				break
			}
			messageSize := int(sizeBuf[3])<<24 | int(sizeBuf[2])<<16 | int(sizeBuf[1])<<8 | int(sizeBuf[0])
			payloadSize := messageSize - 4
			messageBuf := make([]byte, payloadSize)
			_, err = io.ReadFull(outR, messageBuf)
			if err != nil {
				break
			}
			buf := append(sizeBuf, messageBuf...)
			if err := ws.WriteMessage(websocket.BinaryMessage, buf); err != nil {
				break
			}
		}
	}()

	log.Printf("p9server: 9p session start from %s", remote)
	err = srv.Handle(inR, outW)
	if err != nil {
		log.Printf("p9server: 9p session end from %s: %v", remote, err)
		return
	}
	log.Printf("p9server: 9p session end from %s", remote)
}
