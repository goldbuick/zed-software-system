package findplayers

import (
	"errors"
	"testing"
	"testing/fstest"
	"time"
)

func TestResolveExportRootReady(t *testing.T) {
	fsys := fstest.MapFS{
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"bookCount":0}` + "\n"),
		},
	}
	root, err := ResolveExportRoot(fsys, DefaultExportRoots)
	if err != nil {
		t.Fatal(err)
	}
	if root != "zedcafe" {
		t.Fatalf("root: %q", root)
	}
}

func TestResolveExportRootPrefersFirstCandidate(t *testing.T) {
	fsys := fstest.MapFS{
		"#ramfs/zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"bookCount":0}` + "\n"),
		},
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"bookCount":1}` + "\n"),
		},
	}
	root, err := ResolveExportRoot(fsys, DefaultExportRoots)
	if err != nil {
		t.Fatal(err)
	}
	if root != "zedcafe" {
		t.Fatalf("expected first candidate, got %q", root)
	}
}

func TestResolveExportRootNotReady(t *testing.T) {
	_, err := ResolveExportRoot(fstest.MapFS{}, DefaultExportRoots)
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
}

func TestWaitExportRootImmediate(t *testing.T) {
	fsys := fstest.MapFS{
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"bookCount":0}` + "\n"),
		},
	}
	root, err := WaitExportRoot(fsys, DefaultExportRoots, time.Second, time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	if root != "zedcafe" {
		t.Fatalf("root: %q", root)
	}
}

func TestWaitExportRootTimeout(t *testing.T) {
	start := time.Now()
	_, err := WaitExportRoot(
		fstest.MapFS{},
		DefaultExportRoots,
		50*time.Millisecond,
		10*time.Millisecond,
	)
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
	if elapsed := time.Since(start); elapsed < 40*time.Millisecond {
		t.Fatalf("expected to wait, elapsed %v", elapsed)
	}
}
