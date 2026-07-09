//go:build !js

package main

import (
	"net"
	"strings"
	"testing"

	"github.com/hugelgupf/p9/p9"
	"tractor.dev/wanix/fs"
	"tractor.dev/wanix/fs/p9kit"
)

func p9exportsetup(t *testing.T, export fs.FS) (fs.FS, func()) {
	t.Helper()
	a, b := net.Pipe()
	srv := p9.NewServer(p9kit.Attacher(export))
	done := make(chan error, 1)
	go func() {
		done <- srv.Handle(a, a)
	}()
	fsys, err := p9kit.ClientFS(b, "")
	if err != nil {
		t.Fatalf("ClientFS: %v", err)
	}
	cleanup := func() {
		b.Close()
		a.Close()
		<-done
	}
	return fsys, cleanup
}

func TestSchemaGuardP9WriteNestedBookFailsWithoutMkdir(t *testing.T) {
	export := NewEmptyExport()
	fsys, cleanup := p9exportsetup(t, export)
	defer cleanup()

	bookpath := "books/coolregionsbow-sid_vuYEPNKWWAPd/stats.json"
	err := fs.WriteFile(fsys, bookpath, []byte(`{"id":"sid_vuYEPNKWWAPd"}`+"\n"), 0o644)
	if err == nil {
		t.Fatal("expected p9 write without mkdir to fail")
	}
	if !strings.Contains(err.Error(), "walk") {
		t.Fatalf("expected walk error, got %v", err)
	}
}

func TestSchemaGuardP9WriteNestedBookAfterMkdirAll(t *testing.T) {
	export := NewEmptyExport()
	fsys, cleanup := p9exportsetup(t, export)
	defer cleanup()

	bookdir := "books/coolregionsbow-sid_vuYEPNKWWAPd"
	bookpath := bookdir + "/stats.json"
	bookstats := `{"id":"sid_vuYEPNKWWAPd","name":"coolregionsbow","pages":[]}` + "\n"
	if err := fs.MkdirAll(fsys, bookdir, 0o755); err != nil {
		t.Fatalf("mkdirAll book dir: %v", err)
	}
	if err := fs.WriteFile(fsys, bookpath, []byte(bookstats), 0o644); err != nil {
		t.Fatalf("write nested book stats.json: %v", err)
	}
	got, err := fs.ReadFile(fsys, bookpath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(got), `"coolregionsbow"`) {
		t.Fatalf("book stats unexpected: %q", string(got))
	}
}
