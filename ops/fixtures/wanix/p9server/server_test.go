//go:build !js && !wasm

package p9server

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"tractor.dev/wanix/fs"
	"tractor.dev/wanix/fs/p9kit"
	"tractor.dev/wanix/misc"
)

func TestStartServesDirectory(t *testing.T) {
	dir := t.TempDir()
	want := []byte("hello-p9")
	if err := os.WriteFile(filepath.Join(dir, "note.txt"), want, 0o644); err != nil {
		t.Fatal(err)
	}

	srv, err := Start(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = srv.Close() })

	deadline := time.Now().Add(5 * time.Second)
	var conn *websocket.Conn
	for {
		c, _, err := websocket.DefaultDialer.Dial(srv.URL, nil)
		if err == nil {
			conn = c
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("dial: %v", err)
		}
		time.Sleep(50 * time.Millisecond)
	}

	netconn := misc.NewFakeConn(&wsrw{conn: conn})
	fsys, err := p9kit.ClientFS(netconn, "")
	if err != nil {
		t.Fatal(err)
	}
	data, err := fs.ReadFile(fsys, "note.txt")
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != string(want) {
		t.Fatalf("got %q want %q", data, want)
	}

	// write + delete smoke
	if err := fs.WriteFile(fsys, "out.txt", []byte("wrote"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "out.txt")); err != nil {
		t.Fatal(err)
	}
	if err := fs.Remove(fsys, "out.txt"); err != nil {
		t.Fatal(err)
	}
}

type wsrw struct {
	conn *websocket.Conn
	rbuf []byte
}

func (w *wsrw) Read(p []byte) (int, error) {
	for len(w.rbuf) == 0 {
		_, msg, err := w.conn.ReadMessage()
		if err != nil {
			return 0, err
		}
		w.rbuf = msg
	}
	n := copy(p, w.rbuf)
	w.rbuf = w.rbuf[n:]
	return n, nil
}

func (w *wsrw) Write(p []byte) (int, error) {
	if err := w.conn.WriteMessage(websocket.BinaryMessage, append([]byte(nil), p...)); err != nil {
		return 0, err
	}
	return len(p), nil
}

func (w *wsrw) Close() error {
	return w.conn.Close()
}
