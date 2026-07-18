package zedsync

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
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

func TestSteadyTickIdleUsesTwoWalks(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "stats.json", `{"bookCount":1}`, mtime)
	writefile(t, zedcafe, "stats.json", `{"bookCount":1}`, mtime)
	writefile(t, remote, "demo-book1/demo-page1/board/terrain.json", `[]`, mtime)
	writefile(t, zedcafe, "demo-book1/demo-page1/board/terrain.json", `[]`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	z, err := WalkFiles(zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	for rel, m := range z {
		if _, ok := baseline[rel]; !ok {
			baseline[rel] = m
		}
	}
	next, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if LastWalkCount != 2 {
		t.Fatalf("walks=%d want 2", LastWalkCount)
	}
	if len(logs) != 0 {
		t.Fatalf("idle logs=%v", logs)
	}
	if len(next) != len(baseline) {
		t.Fatalf("baseline size %d != next %d", len(baseline), len(next))
	}
}

func TestSteadyTickRemoteDeleteRestoresFromZedcafe(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "x.json", `1`, mtime)
	writefile(t, zedcafe, "x.json", `1`, mtime)
	writefile(t, remote, "y.json", `keep-me`, mtime)
	writefile(t, zedcafe, "y.json", `keep-me`, mtime)

	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// delete y on remote -- should come back from zedcafe
	if err := os.Remove(filepath.Join(remote, "y.json")); err != nil {
		t.Fatal(err)
	}
	baseline, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(remote, "y.json"))
	if err != nil {
		t.Fatalf("expected y restored on remote, logs=%v err=%v", logs, err)
	}
	if string(body) != "keep-me" {
		t.Fatalf("body=%q logs=%v", body, logs)
	}
	if _, err := os.Stat(filepath.Join(zedcafe, "y.json")); err != nil {
		t.Fatal("zedcafe y.json should remain")
	}
	if _, ok := baseline["y.json"]; !ok {
		t.Fatal("baseline should still have y.json")
	}
}

func TestSteadyTickZedcafeDeleteRemovesRemote(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "y.json", `2`, mtime)
	writefile(t, zedcafe, "y.json", `2`, mtime)

	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(filepath.Join(zedcafe, "y.json")); err != nil {
		t.Fatal(err)
	}
	baseline, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(remote, "y.json")); !os.IsNotExist(err) {
		t.Fatalf("expected y deleted on remote, logs=%v", logs)
	}
	if _, ok := baseline["y.json"]; ok {
		t.Fatal("baseline still has y.json")
	}
}

// Conflict policy: newer mtime wins. When both sides changed since baseline,
// the side with the newer mtime is copied -- see "Peer sync (zedsync)" >
// "Conflict policy: newer mtime wins" in feature/wanix/README.md.
func TestSteadyTickConflictRemoteNewerWins(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	base := time.Now().Add(-time.Hour)
	writefile(t, remote, "c.json", `old`, base)
	writefile(t, zedcafe, "c.json", `old`, base)
	baseline, _ := WalkFiles(remote)

	older := time.Now()
	newer := older.Add(time.Minute)
	writefile(t, zedcafe, "c.json", `from-zedcafe`, older)
	writefile(t, remote, "c.json", `from-remote`, newer)

	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	zedbody, err := os.ReadFile(filepath.Join(zedcafe, "c.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(zedbody) != "from-remote" {
		t.Fatalf("zedcafe body=%q logs=%v", zedbody, logs)
	}
}

func TestSteadyTickConflictZedcafeNewerWins(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	base := time.Now().Add(-time.Hour)
	writefile(t, remote, "c.json", `old`, base)
	writefile(t, zedcafe, "c.json", `old`, base)
	baseline, _ := WalkFiles(remote)

	older := time.Now()
	newer := older.Add(time.Minute)
	writefile(t, remote, "c.json", `from-remote`, older)
	writefile(t, zedcafe, "c.json", `from-zedcafe`, newer)

	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	remotebody, err := os.ReadFile(filepath.Join(remote, "c.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(remotebody) != "from-zedcafe" {
		t.Fatalf("remote body=%q logs=%v", remotebody, logs)
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

func TestInitialSeedMonolithicTerrain(t *testing.T) {
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
	writefile(
		t,
		zedcafe,
		"demo-book1/demo-page1/board/terrain.json",
		`[{"kind":"empty"}]`,
		time.Now(),
	)
	writefile(t, zedcafe, "demo-book1/flags/pid_1.json", `{"ammo":1}`, time.Now())
	r, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	z, err := WalkFiles(zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	if len(z) != 3 {
		t.Fatalf("zedcafe files=%d want 3", len(z))
	}
	n, err := InitialSeed(remote, zedcafe, r, z)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Fatalf("copied=%d want 3", n)
	}
	terrainpath := filepath.Join(remote, "demo-book1", "demo-page1", "board", "terrain.json")
	if _, err := os.Stat(terrainpath); err != nil {
		t.Fatal(err)
	}
}

func TestWalkSkipsDotPaths(t *testing.T) {
	dir := t.TempDir()
	writefile(t, dir, ".DS_Store", "finder", time.Now())
	writefile(t, dir, ".gitignore", "ignore", time.Now())
	writefile(t, dir, ReadySentinel, "ok", time.Now())
	writefile(t, dir, "book/._stats.json", "appledouble", time.Now())
	writefile(t, dir, "book/stats.json", `{}`, time.Now())
	writefile(t, dir, "a.json", `1`, time.Now())
	writefile(t, dir, ".git/config", "git", time.Now())
	snap, err := WalkFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{
		".DS_Store",
		".gitignore",
		ReadySentinel,
		"book/._stats.json",
		".git/config",
	} {
		if _, ok := snap[path]; ok {
			t.Fatalf("%s should be skipped", path)
		}
	}
	if _, ok := snap["book/stats.json"]; !ok {
		t.Fatal("missing book/stats.json")
	}
	if _, ok := snap["a.json"]; !ok {
		t.Fatal("missing a.json")
	}
}

func TestSteadyTickRemoteFlagEdit(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	flagpath := "demo-book1/flags/pid_1.json"
	writefile(t, remote, flagpath, `{"ammo":0}`, mtime)
	writefile(t, zedcafe, flagpath, `{"ammo":0}`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	newer := time.Now()
	writefile(t, remote, flagpath, `{"ammo":500}`, newer)

	next, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(zedcafe, filepath.FromSlash(flagpath)))
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != `{"ammo":500}` {
		t.Fatalf("zedcafe body=%q logs=%v", body, logs)
	}
	found := false
	for _, line := range logs {
		if strings.Contains(line, "update zedcafe") && strings.Contains(line, flagpath) {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected update zedcafe log, got %v", logs)
	}
	if _, ok := next[flagpath]; !ok {
		t.Fatal("baseline missing flag path")
	}
}

func TestSteadyTickRemoteTerrainEdit(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	terrain := "demo-book1/demo-page1/board/terrain.json"
	writefile(t, remote, terrain, `[{"kind":"empty"}]`, mtime)
	writefile(t, zedcafe, terrain, `[{"kind":"empty"}]`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	painted := `[{"kind":"fake","char":3,"color":12}]`
	writefile(t, remote, terrain, painted, time.Now())

	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(zedcafe, filepath.FromSlash(terrain)))
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != painted {
		t.Fatalf("zedcafe terrain=%q logs=%v", body, logs)
	}
}

func TestSteadyTickIgnoresEqualSizeMtimeDrift(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	old := time.Now().Add(-time.Hour)
	body := `{"ammo":1}`
	writefile(t, remote, "flags/pid_1.json", body, old)
	writefile(t, zedcafe, "flags/pid_1.json", body, old)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// Same content/size, newer mtime only on zedcafe (simulates failed Chtimes).
	writefile(t, zedcafe, "flags/pid_1.json", body, time.Now())

	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 0 {
		t.Fatalf("expected idle for mtime-only drift, logs=%v", logs)
	}
}

func TestPruneEmptyDirsNonemptyIsNonfatal(t *testing.T) {
	dir := t.TempDir()
	child := filepath.Join(dir, "board", "objects")
	if err := os.MkdirAll(child, 0o755); err != nil {
		t.Fatal(err)
	}
	writefile(t, dir, "board/objects/keep.json", `{}`, time.Now())
	pruneemptydirs([]string{child, filepath.Join(dir, "board")})
	if _, err := os.Stat(filepath.Join(dir, "board", "objects", "keep.json")); err != nil {
		t.Fatal("non-empty objects dir should not be removed")
	}
}

func TestReadRevisionMissingFileReturnsZero(t *testing.T) {
	dir := t.TempDir()
	rev, paths, err := ReadRevision(dir)
	if err != nil {
		t.Fatal(err)
	}
	if rev != 0 || paths != nil {
		t.Fatalf("rev=%d paths=%v want 0/nil", rev, paths)
	}
}

func TestReadRevisionParsesPayload(t *testing.T) {
	dir := t.TempDir()
	writefile(t, dir, RevisionFile, `{"revision":3,"paths":["a.json","b.json"]}`, time.Time{})
	rev, paths, err := ReadRevision(dir)
	if err != nil {
		t.Fatal(err)
	}
	if rev != 3 {
		t.Fatalf("rev=%d want 3", rev)
	}
	if len(paths) != 2 || paths[0] != "a.json" || paths[1] != "b.json" {
		t.Fatalf("paths=%v", paths)
	}
}

func TestSteadyTickIncrementalScopedToRevisionPaths(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "keep.json", `1`, mtime)
	writefile(t, zedcafe, "keep.json", `1`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// New file on zedcafe, revision hint points at just this path -- an
	// incremental tick should copy it without walking either tree.
	writefile(t, zedcafe, "flags/pid_1.json", `{"ammo":9}`, time.Now())
	writefile(t, zedcafe, RevisionFile, `{"revision":1,"paths":["flags/pid_1.json"]}`, time.Time{})

	next, logs, newrev, err := SteadyTickIncremental(remote, zedcafe, baseline, 0)
	if err != nil {
		t.Fatal(err)
	}
	if newrev != 1 {
		t.Fatalf("newrev=%d want 1", newrev)
	}
	// Scoped host paths avoid WalkFiles; peer-only pass walks remote once.
	if LastWalkCount != 1 {
		t.Fatalf("walks=%d want 1 (peer-only pass after scoped host tick)", LastWalkCount)
	}
	body, err := os.ReadFile(filepath.Join(remote, "flags", "pid_1.json"))
	if err != nil {
		t.Fatalf("expected flag copied to remote, logs=%v err=%v", logs, err)
	}
	if string(body) != `{"ammo":9}` {
		t.Fatalf("body=%q", body)
	}
	if _, ok := next["flags/pid_1.json"]; !ok {
		t.Fatal("next snapshot missing scoped path")
	}
	if _, ok := next["keep.json"]; !ok {
		t.Fatal("next snapshot should still carry unrelated baseline entries")
	}
}

func TestSteadyTickIncrementalSameRevisionChecksRemoteOnly(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "x.json", `1`, mtime)
	writefile(t, zedcafe, "x.json", `1`, mtime)
	writefile(t, zedcafe, RevisionFile, `{"revision":5,"paths":["x.json"]}`, time.Time{})
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}

	// Peer edits remote directly; revision file is unchanged (rev == lastrev).
	writefile(t, remote, "x.json", `from-peer`, time.Now())

	next, _, newrev, err := SteadyTickIncremental(remote, zedcafe, baseline, 5)
	if err != nil {
		t.Fatal(err)
	}
	if newrev != 5 {
		t.Fatalf("newrev=%d want 5 (unchanged)", newrev)
	}
	if LastWalkCount != 1 {
		t.Fatalf("walks=%d want 1 (remote-only)", LastWalkCount)
	}
	body, err := os.ReadFile(filepath.Join(zedcafe, "x.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "from-peer" {
		t.Fatalf("zedcafe body=%q", body)
	}
	if next["x.json"].Size != int64(len("from-peer")) {
		t.Fatalf("next snapshot not updated for x.json: %v", next["x.json"])
	}
}

func TestSteadyTickIncrementalEmptyPathsNeedsFullTick(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	writefile(t, zedcafe, RevisionFile, `{"revision":2,"paths":[]}`, time.Time{})

	_, _, _, err := SteadyTickIncremental(remote, zedcafe, Snapshot{}, 0)
	if !errors.Is(err, ErrZedsyncNeedFullTick) {
		t.Fatalf("err=%v want ErrZedsyncNeedFullTick", err)
	}
}

func TestSteadyTickIncrementalUnparseableRevisionNeedsFullTick(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	writefile(t, zedcafe, RevisionFile, `not json`, time.Time{})

	_, _, _, err := SteadyTickIncremental(remote, zedcafe, Snapshot{}, 0)
	if !errors.Is(err, ErrZedsyncNeedFullTick) {
		t.Fatalf("err=%v want ErrZedsyncNeedFullTick", err)
	}
}

// Conflict policy: newer mtime wins on a scoped incremental tick.
func TestSteadyTickIncrementalConflictRemoteNewerWins(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	base := time.Now().Add(-time.Hour)
	writefile(t, remote, "c.json", `old`, base)
	writefile(t, zedcafe, "c.json", `old`, base)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}

	older := time.Now()
	newer := older.Add(time.Minute)
	writefile(t, zedcafe, "c.json", `from-zedcafe`, older)
	writefile(t, remote, "c.json", `from-remote`, newer)
	writefile(t, zedcafe, RevisionFile, `{"revision":1,"paths":["c.json"]}`, time.Time{})

	_, logs, _, err := SteadyTickIncremental(remote, zedcafe, baseline, 0)
	if err != nil {
		t.Fatal(err)
	}
	zedbody, err := os.ReadFile(filepath.Join(zedcafe, "c.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(zedbody) != "from-remote" {
		t.Fatalf("zedcafe body=%q logs=%v", zedbody, logs)
	}
}

// When host revision bumps with only stats.json, peer board/terrain.json
// edits outside the revision list must still copytoz.
func TestSteadyTickIncrementalPeerPassAfterRevisionBump(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "stats.json", `{"exportRevision":0}`, mtime)
	writefile(t, zedcafe, "stats.json", `{"exportRevision":0}`, mtime)
	writefile(t, remote, "title/board/terrain.json", `old-terrain`, mtime)
	writefile(t, zedcafe, "title/board/terrain.json", `old-terrain`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}

	// Host bump lists only stats; peer edited terrain outside that list.
	writefile(t, zedcafe, "stats.json", `{"exportRevision":1}`, time.Now())
	writefile(t, zedcafe, RevisionFile, `{"revision":1,"paths":["stats.json"]}`, time.Time{})
	writefile(t, remote, "title/board/terrain.json", `peer-terrain`, time.Now())

	_, logs, newrev, err := SteadyTickIncremental(remote, zedcafe, baseline, 0)
	if err != nil {
		t.Fatal(err)
	}
	if newrev != 1 {
		t.Fatalf("newrev=%d want 1", newrev)
	}
	body, err := os.ReadFile(filepath.Join(zedcafe, "title", "board", "terrain.json"))
	if err != nil {
		t.Fatalf("read terrain: %v logs=%v", err, logs)
	}
	if string(body) != "peer-terrain" {
		t.Fatalf("zedcafe terrain=%q logs=%v", body, logs)
	}
}

func TestSteadyTickRecoversPanic(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	baseline := Snapshot{}
	steadyticktesthook = func() {
		panic("simulated js fs error")
	}
	defer func() { steadyticktesthook = nil }()

	next, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err == nil {
		t.Fatal("expected recovered panic error")
	}
	if !strings.Contains(err.Error(), "panic during tick") {
		t.Fatalf("err=%v", err)
	}
	if logs != nil && len(logs) != 0 {
		t.Fatalf("logs=%v", logs)
	}
	if len(next) != 0 {
		t.Fatalf("expected original baseline, got %v", next)
	}
}
