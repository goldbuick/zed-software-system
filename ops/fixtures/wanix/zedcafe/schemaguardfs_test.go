//go:build !js

package main

import (
	"errors"
	"strings"
	"testing"

	"tractor.dev/wanix/fs"
	"tractor.dev/wanix/fs/fskit"
	"tractor.dev/wanix/fs/memfs"
)

func TestSchemaGuardRejectsInvalidCreate(t *testing.T) {
	guarded := newSchemaGuardFS(memfs.New())
	_, err := fs.Create(guarded, "evil.txt")
	if err == nil {
		t.Fatal("expected create evil.txt to fail")
	}
	var patherr *fs.PathError
	if !errors.As(err, &patherr) {
		t.Fatalf("expected PathError, got %T: %v", err, err)
	}
	if !errors.Is(patherr.Err, fs.ErrPermission) {
		t.Fatalf("expected ErrPermission, got %v", patherr.Err)
	}
}

func TestSchemaGuardNestedBookPathFromEmptyExport(t *testing.T) {
	export := NewEmptyExport()
	rootstats := `{"exportedAt":"test","bookCount":1,"books":[{"id":"sid_vuYEPNKWWAPd","name":"coolregionsbow"}]}` + "\n"
	if err := fs.WriteFile(export, "stats.json", []byte(rootstats), 0o644); err != nil {
		t.Fatalf("write root stats.json: %v", err)
	}
	bookpath := "books/coolregionsbow-sid_vuYEPNKWWAPd/stats.json"
	bookstats := `{"id":"sid_vuYEPNKWWAPd","name":"coolregionsbow","pages":[]}` + "\n"
	if err := fs.WriteFile(export, bookpath, []byte(bookstats), 0o644); err != nil {
		t.Fatalf("write nested book stats.json: %v", err)
	}
	gotroot, err := fs.ReadFile(export, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(gotroot), `"coolregionsbow"`) {
		t.Fatalf("root stats unexpected: %q", string(gotroot))
	}
	gotbook, err := fs.ReadFile(export, bookpath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(gotbook), `"sid_vuYEPNKWWAPd"`) {
		t.Fatalf("book stats unexpected: %q", string(gotbook))
	}
}

func TestSchemaGuardAllowsStatsJsonCreateWrite(t *testing.T) {
	guarded := newSchemaGuardFS(memfs.New())
	written := `{"exportedAt":"guest","bookCount":0,"books":[],"guestTouch":true}` + "\n"
	file, err := fs.Create(guarded, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fs.Write(file, []byte(written)); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	got, err := fs.ReadFile(guarded, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(got), `"guestTouch":true`) {
		t.Fatalf("write round-trip failed: %q", string(got))
	}
}

func TestSchemaGuardAllowsDeepObjectPath(t *testing.T) {
	inner := memfs.From(fskit.MapFS{
		"books/demo-book1/pages/demo-page1/board/stats.json": fskit.RawNode([]byte("{}\n")),
		"books/demo-book1/pages/demo-page1/board/objects/existing.json": fskit.RawNode([]byte("{}\n")),
	})
	guarded := newSchemaGuardFS(inner)
	objectpath := "books/demo-book1/pages/demo-page1/board/objects/obj1.json"
	file, err := fs.Create(guarded, objectpath)
	if err != nil {
		t.Fatalf("create object json: %v", err)
	}
	payload := `{"id":"obj1"}` + "\n"
	if _, err := fs.Write(file, []byte(payload)); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	got, err := fs.ReadFile(guarded, objectpath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(got), `"obj1"`) {
		t.Fatalf("object write failed: %q", string(got))
	}
}

func TestSchemaGuardRejectsInvalidMkdir(t *testing.T) {
	guarded := newSchemaGuardFS(memfs.New())
	err := fs.Mkdir(guarded, "totally/invalid", 0o755)
	if err == nil {
		t.Fatal("expected mkdir totally/invalid to fail")
	}
}

func TestSchemaGuardAllowsBookPrefixMkdir(t *testing.T) {
	guarded := newSchemaGuardFS(memfs.New())
	if err := fs.Mkdir(guarded, "books", 0o755); err != nil {
		t.Fatalf("mkdir books: %v", err)
	}
	bookdir := "books/coolregionsbow-sid_vuYEPNKWWAPd"
	if err := fs.Mkdir(guarded, bookdir, 0o755); err != nil {
		t.Fatalf("mkdir book prefix: %v", err)
	}
}

func TestIsAllowedExportPath(t *testing.T) {
	if !isallowedexportpath("stats.json") {
		t.Fatal("stats.json should be allowed")
	}
	if isallowedexportpath("../stats.json") {
		t.Fatal("../stats.json should be rejected")
	}
	if isallowedexportpath("books/foo/bar.json") {
		t.Fatal("books/foo/bar.json should be rejected")
	}
}
