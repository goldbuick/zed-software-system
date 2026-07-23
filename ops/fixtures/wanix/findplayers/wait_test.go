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
			Data: []byte(`{"exportedAt":"test","bookCount":0}` + "\n"),
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
			Data: []byte(`{"exportedAt":"ram","bookCount":0}` + "\n"),
		},
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"live","bookCount":1}` + "\n"),
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
			Data: []byte(`{"exportedAt":"test","bookCount":0}` + "\n"),
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

func TestExportRootReadyRejectsEmptyStats(t *testing.T) {
	fsys := fstest.MapFS{
		"zedcafe/stats.json": &fstest.MapFile{Data: []byte{}},
	}
	if ExportRootReady(fsys, "zedcafe") {
		t.Fatal("expected empty stats.json to be not ready")
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

func TestWaitExportScanImmediate(t *testing.T) {
	fsys := fstest.MapFS{
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"test","bookCount":0,"books":[]}` + "\n"),
		},
	}
	root, report, err := WaitExportScan(
		fsys,
		DefaultExportRoots,
		time.Second,
		time.Millisecond,
	)
	if err != nil {
		t.Fatal(err)
	}
	if root != "zedcafe" {
		t.Fatalf("root: %q", root)
	}
	if report.PlayerCount != 0 {
		t.Fatalf("player count: %d", report.PlayerCount)
	}
}

func TestWaitExportScanIncompleteLeafTimeout(t *testing.T) {
	fsys := fstest.MapFS{
		"zedcafe/stats.json": &fstest.MapFile{
			Data: []byte(`{"exportedAt":"test","bookCount":1,"books":[]}` + "\n"),
		},
		"zedcafe/main-book1/stats.json": &fstest.MapFile{
			Data: []byte(`{"activelist":["pid_1"]}` + "\n"),
		},
		"zedcafe/main-book1/flags/pid_1.json": &fstest.MapFile{
			Data: []byte(`{"board":"title-page1"}` + "\n"),
		},
		"zedcafe/main-book1/title-page1/board/terrain.json": &fstest.MapFile{
			Data: []byte(`[]` + "\n"),
		},
		"zedcafe/main-book1/title-page1/board/objects/pid_1.json": &fstest.MapFile{
			Data: []byte{},
		},
	}
	_, _, err := WaitExportScan(
		fsys,
		DefaultExportRoots,
		40*time.Millisecond,
		10*time.Millisecond,
	)
	if !errors.Is(err, ErrExportNotReady) {
		t.Fatalf("expected ErrExportNotReady, got %v", err)
	}
}
