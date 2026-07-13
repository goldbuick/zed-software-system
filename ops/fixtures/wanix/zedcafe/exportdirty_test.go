//go:build !js

package main

import (
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
	setdirtynotify(func() {
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

func TestExportDirtyRejectDoesNotNotify(t *testing.T) {
	cleardirtytimerfortest()
	var count atomic.Int32
	setdirtynotify(func() {
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
	setdirtynotify(func() {
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
