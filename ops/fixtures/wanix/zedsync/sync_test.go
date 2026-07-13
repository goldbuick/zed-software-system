package zedsync

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writefile(t *testing.T, root, rel, body string, mtime time.Time) {
	t.Helper()
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	if !mtime.IsZero() {
		if err := os.Chtimes(path, mtime, mtime); err != nil {
			t.Fatal(err)
		}
	}
}

func TestInitialSeedEmptyRemoteFromZedcafe(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	if err := os.MkdirAll(remote, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(zedcafe, 0o755); err != nil {
		t.Fatal(err)
	}
	writefile(t, zedcafe, "stats.json", `{"exportedAt":"t","bookCount":1}`, time.Now())
	writefile(t, zedcafe, "book/a.json", `{"a":1}`, time.Now())

	r, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	z, err := WalkFiles(zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	n, err := InitialSeed(remote, zedcafe, r, z)
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Fatalf("copied=%d want 2", n)
	}
	if _, err := os.Stat(filepath.Join(remote, "stats.json")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(remote, "book", "a.json")); err != nil {
		t.Fatal(err)
	}
}

func TestInitialSeedEmptyDoesNotWipePeer(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	if err := os.MkdirAll(remote, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(zedcafe, 0o755); err != nil {
		t.Fatal(err)
	}
	writefile(t, zedcafe, "keep.json", `1`, time.Now())
	r, _ := WalkFiles(remote)
	z, _ := WalkFiles(zedcafe)
	if _, err := InitialSeed(remote, zedcafe, r, z); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(zedcafe, "keep.json")); err != nil {
		t.Fatal("zedcafe wiped on empty remote seed")
	}
}

func TestSteadyTickDeleteBothWays(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "x.json", `1`, mtime)
	writefile(t, zedcafe, "x.json", `1`, mtime)
	writefile(t, remote, "y.json", `2`, mtime)
	writefile(t, zedcafe, "y.json", `2`, mtime)

	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// delete y on remote
	if err := os.Remove(filepath.Join(remote, "y.json")); err != nil {
		t.Fatal(err)
	}
	baseline, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(zedcafe, "y.json")); !os.IsNotExist(err) {
		t.Fatalf("expected y deleted on zedcafe, logs=%v", logs)
	}
	if _, ok := baseline["y.json"]; ok {
		t.Fatal("baseline still has y.json")
	}
}

func TestSteadyTickConflictRemoteWinsOnTie(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	base := time.Now().Add(-time.Hour)
	writefile(t, remote, "c.json", `old`, base)
	writefile(t, zedcafe, "c.json", `old`, base)
	baseline, _ := WalkFiles(remote)

	same := time.Now()
	writefile(t, remote, "c.json", `from-remote`, same)
	writefile(t, zedcafe, "c.json", `from-zedcafe`, same)

	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(zedcafe, "c.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "from-remote" {
		t.Fatalf("body=%q logs=%v", body, logs)
	}
}

func TestWalkSkipsReadySentinel(t *testing.T) {
	dir := t.TempDir()
	writefile(t, dir, ReadySentinel, "ok", time.Now())
	writefile(t, dir, "a.json", `1`, time.Now())
	snap, err := WalkFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := snap[ReadySentinel]; ok {
		t.Fatal("sentinel should be skipped")
	}
	if _, ok := snap["a.json"]; !ok {
		t.Fatal("missing a.json")
	}
}
