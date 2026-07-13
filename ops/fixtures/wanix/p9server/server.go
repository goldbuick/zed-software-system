//go:build !js && !wasm

package p9server

import (
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
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

// Server serves a directory over WebSocket 9P (wanix serve compatible).
type Server struct {
	httpServer *http.Server
	listener   net.Listener
	RootDir    string
	URL        string // ws://127.0.0.1:<port>/
}

// Start listens on 127.0.0.1:0 and serves rootdir via WS→9P.
func Start(rootdir string) (*Server, error) {
	abs, err := filepath.Abs(rootdir)
	if err != nil {
		return nil, err
	}
	dirfs, err := localfs.New(abs)
	if err != nil {
		return nil, err
	}
	p9srv := p9.NewServer(p9kit.Attacher(dirfs, p9kit.WithXattrAttrStore()))

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if websocket.IsWebSocketUpgrade(r) {
			handlep9(p9srv, w, r)
			return
		}
		http.Error(w, "expecting websocket upgrade", http.StatusBadRequest)
	})
	hs := &http.Server{Handler: mux}
	s := &Server{
		httpServer: hs,
		listener:   ln,
		RootDir:    abs,
		URL:        fmt.Sprintf("ws://%s/", ln.Addr().String()),
	}
	go func() {
		if err := hs.Serve(ln); err != nil && err != http.ErrServerClosed {
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
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer ws.Close()

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

	_ = srv.Handle(inR, outW)
}
