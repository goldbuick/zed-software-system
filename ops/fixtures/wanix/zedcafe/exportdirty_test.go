//go:build !js

package main

import (
	"sort"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"tractor.dev/wanix/fs"
)

func waitfornotify(t *testing.T, count *atomic.Int32, want int32) {
	t.Helper()
	deadline := time.Now().Add(exportdirtydebounce + 200*time.Millisecond)
	for time.Now().Before(deadline) {
		if count.Load() >= want {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("expected notify count >= %d, got %d", want, count.Load())
}

func TestExportDirtyCoalescesWrites(t *testing.T) {
	cleardirtytimerfortest()
	var count atomic.Int32
	setdirtynotify(func(paths []string) {
		count.Add(1)
	})
	t.Cleanup(func() {
		cleardirtytimerfortest()
		setdirtynotify(nil)
	})

	exportfs := NewEmptyExport()
	seed := []byte(`{"exportedAt":"test","bookCount":0,"books":[]}` + "\n")
	if err := fs.WriteFile(exportfs, "stats.json", seed, 0o644); err != nil {
		t.Fatal(err)
	}
	written := []byte(`{"exportedAt":"guest","bookCount":0,"books":[],"n":1}` + "\n")
	if err := fs.WriteFile(exportfs, "stats.json", written, 0o644); err != nil {
		t.Fatal(err)
	}
	file, err := fs.Create(exportfs, "stats.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fs.Write(file, []byte(`{"exportedAt":"guest","bookCount":0,"books":[],"n":2}`+"\n")); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}

	waitfornotify(t, &count, 1)
	time.Sleep(exportdirtydebounce + 50*time.Millisecond)
	if got := count.Load(); got != 1 {
		t.Fatalf("expected coalesced single notify, got %d", got)
	}
}

func TestExportDirtyCoalescesPaths(t *testing.T) {
	cleardirtytimerfortest()
	var mu sync.Mutex
	var notified [][]string
	setdirtynotify(func(paths []string) {
		mu.Lock()
		defer mu.Unlock()
		notified = append(notified, paths)
	})
	t.Cleanup(func() {
		cleardirtytimerfortest()
		setdirtynotify(nil)
	})

	exportfs := NewEmptyExport()
	if err := fs.WriteFile(exportfs, "stats.json", []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := fs.WriteFile(exportfs, "book1/stats.json", []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := fs.WriteFile(exportfs, "stats.json", []byte(`{"n":1}`+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(exportdirtydebounce + 200*time.Millisecond)
	for time.Now().Before(deadline) {
		mu.Lock()
		got := len(notified)
		mu.Unlock()
		if got >= 1 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()
	if len(notified) != 1 {
		t.Fatalf("expected coalesced single notify, got %d", len(notified))
	}
	paths := append([]string{}, notified[0]...)
	sort.Strings(paths)
	expected := []string{"book1/stats.json", "stats.json"}
	if len(paths) != len(expected) {
		t.Fatalf("expected paths %v, got %v", expected, paths)
	}
	for i := range expected {
		if paths[i] != expected[i] {
			t.Fatalf("expected paths %v, got %v", expected, paths)
		}
	}
}

func TestExportDirtyRejectDoesNotNotify(t *testing.T) {
	cleardirtytimerfortest()
	var count atomic.Int32
	setdirtynotify(func(paths []string) {
		count.Add(1)
	})
	t.Cleanup(func() {
		cleardirtytimerfortest()
		setdirtynotify(nil)
	})

	exportfs := NewEmptyExport()
	_, err := fs.Create(exportfs, "evil.txt")
	if err == nil {
		t.Fatal("expected reject")
	}
	time.Sleep(exportdirtydebounce + 50*time.Millisecond)
	if got := count.Load(); got != 0 {
		t.Fatalf("expected no notify on reject, got %d", got)
	}
}

func TestExportDirtyRemoveNotifies(t *testing.T) {
	cleardirtytimerfortest()
	var count atomic.Int32
	setdirtynotify(func(paths []string) {
		count.Add(1)
	})
	t.Cleanup(func() {
		cleardirtytimerfortest()
		setdirtynotify(nil)
	})

	exportfs := NewEmptyExport()
	if err := fs.WriteFile(exportfs, "stats.json", []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	waitfornotify(t, &count, 1)
	count.Store(0)
	cleardirtytimerfortest()

	if err := fs.Remove(exportfs, "stats.json"); err != nil {
		t.Fatal(err)
	}
	waitfornotify(t, &count, 1)
}

func TestExportReadDirRootSucceeds(t *testing.T) {
	exportfs := NewEmptyExport()
	if err := fs.WriteFile(exportfs, "stats.json", []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	entries, err := fs.ReadDir(exportfs, ".")
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, entry := range entries {
		if entry.Name() == "stats.json" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected stats.json in ReadDir(.), got %#v", entries)
	}
}
