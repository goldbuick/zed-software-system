//go:build !js && !wasm

package p9server

import (
	"crypto/tls"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"tractor.dev/wanix/fs"
	"tractor.dev/wanix/fs/p9kit"
	"tractor.dev/wanix/misc"
)

func mkcertopts(t *testing.T) Options {
	t.Helper()
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skip(err)
	}
	cert := filepath.Join(home, ".vite-plugin-mkcert", "cert.pem")
	key := filepath.Join(home, ".vite-plugin-mkcert", "dev.pem")
	if _, err := os.Stat(cert); err != nil {
		t.Skip("no cafe mkcert certs")
	}
	if _, err := os.Stat(key); err != nil {
		t.Skip("no cafe mkcert key")
	}
	return Options{CertFile: cert, KeyFile: key}
}

func TestStartRequiresTLS(t *testing.T) {
	_, err := Start(t.TempDir(), Options{})
	if err == nil {
		t.Fatal("expected error without cert/key")
	}
}

func TestStartServesDirectory(t *testing.T) {
	opts := mkcertopts(t)
	opts.Port = 0 // ephemeral -- do not fight the fixed-port dev server
	dir := t.TempDir()
	want := []byte("hello-p9")
	if err := os.WriteFile(filepath.Join(dir, "note.txt"), want, 0o644); err != nil {
		t.Fatal(err)
	}

	srv, err := Start(dir, opts)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = srv.Close() })
	if len(srv.URL) < 6 || srv.URL[:6] != "wss://" {
		t.Fatalf("want wss URL, got %q", srv.URL)
	}

	dialer := *websocket.DefaultDialer
	dialer.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec // local fixture smoke

	deadline := time.Now().Add(5 * time.Second)
	var conn *websocket.Conn
	for {
		c, _, err := dialer.Dial(srv.URL, nil)
		if err == nil {
			conn = c
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("wss dial: %v", err)
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
