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

func TestWalkSkipsSimOnlyFlags(t *testing.T) {
	dir := t.TempDir()
	writefile(t, dir, "book/flags/pid_1.json", `{"ammo":1}`, time.Now())
	writefile(t, dir, "book/flags/pid_1_chip.json", `{"ec":1}`, time.Now())
	writefile(t, dir, "book/flags/pid_1_gadget.json", `{}`, time.Now())
	writefile(t, dir, "book/flags/board1_synth.json", `{}`, time.Now())
	writefile(t, dir, "book/flags/board1_layers.json", `{}`, time.Now())
	writefile(t, dir, "book/flags/board1_tracking.json", `{}`, time.Now())
	snap, err := WalkFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := snap["book/flags/pid_1.json"]; !ok {
		t.Fatal("gameplay flag should be walked")
	}
	for _, path := range []string{
		"book/flags/pid_1_chip.json",
		"book/flags/pid_1_gadget.json",
		"book/flags/board1_synth.json",
		"book/flags/board1_layers.json",
		"book/flags/board1_tracking.json",
	} {
		if _, ok := snap[path]; ok {
			t.Fatalf("%s should be skipped", path)
		}
	}
}

func TestWalkIncludesPlayerObjects(t *testing.T) {
	dir := t.TempDir()
	writefile(t, dir, "book/page/board/objects/npc1.json", `{"kind":"object"}`, time.Now())
	writefile(t, dir, "book/page/board/objects/pid_1.json", `{"kind":"player"}`, time.Now())
	writefile(t, dir, "book/page/board/objects/pid_abcd.json", `{"kind":"player"}`, time.Now())
	snap, err := WalkFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{
		"book/page/board/objects/npc1.json",
		"book/page/board/objects/pid_1.json",
		"book/page/board/objects/pid_abcd.json",
	} {
		if _, ok := snap[path]; !ok {
			t.Fatalf("%s should be walked", path)
		}
	}
}

func TestPlanopNeverCopytozPlayerObjects(t *testing.T) {
	rel := "book/page/board/objects/pid_1.json"
	now := time.Now().UTC()
	older := now.Add(-time.Hour)
	bm := FileMeta{Rel: rel, Size: 2, Mtime: older}
	rm := FileMeta{Rel: rel, Size: 3, Mtime: now} // peer strictly newer
	zm := FileMeta{Rel: rel, Size: 2, Mtime: older}
	op, needed := planop(rel, bm, true, rm, true, zm, true)
	if needed {
		t.Fatalf("player objects must not copytoz, got %+v", op)
	}
	// Peer-only create must not copytoz either
	op, needed = planop(rel, FileMeta{}, false, rm, true, FileMeta{}, false)
	if needed {
		t.Fatalf("peer-only player object must not copytoz, got %+v", op)
	}
	// copytor still allowed when zedcafe is the only change
	rm2 := FileMeta{Rel: rel, Size: 2, Mtime: older}
	zm2 := FileMeta{Rel: rel, Size: 9, Mtime: now}
	op, needed = planop(rel, bm, true, rm2, true, zm2, true)
	if !needed || op.kind != "copytor" {
		t.Fatalf("want copytor when zedcafe newer, got needed=%v op=%+v", needed, op)
	}
}

func TestSteadyTickDeletesPeerPlayerObjectOrphan(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	rel := "book/page/board/objects/pid_1.json"
	writefile(t, remote, rel, `{"kind":"player"}`, mtime)
	writefile(t, zedcafe, rel, `{"kind":"player"}`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// Export dropped the avatar; peer still has the orphan.
	if err := os.Remove(filepath.Join(zedcafe, filepath.FromSlash(rel))); err != nil {
		t.Fatal(err)
	}
	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(remote, filepath.FromSlash(rel))); !os.IsNotExist(err) {
		t.Fatalf("peer orphan must be deleted, logs=%v err=%v", logs, err)
	}
	found := false
	for _, line := range logs {
		if strings.Contains(line, "delete remote") && strings.Contains(line, rel) {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected deleteremote log, got %v", logs)
	}
}

func TestSteadyTickCopytorPlayerObject(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	rel := "book/page/board/objects/pid_1.json"
	writefile(t, zedcafe, rel, `{"kind":"player","x":1}`, time.Now())
	// Peer empty for this path; baseline empty for rel
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	_ = mtime
	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(remote, filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("copytor should create peer file: %v logs=%v", err, logs)
	}
	if !strings.Contains(string(body), `"player"`) {
		t.Fatalf("body=%q", body)
	}
}

func TestSteadyTickRemoteFlagEditDoesNotCopytoz(t *testing.T) {
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

	_, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(filepath.Join(zedcafe, filepath.FromSlash(flagpath)))
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != `{"ammo":0}` {
		t.Fatalf("zedcafe must keep live flags, body=%q logs=%v", body, logs)
	}
	for _, line := range logs {
		if strings.Contains(line, "zedcafe <-") && strings.Contains(line, flagpath) {
			t.Fatalf("player flags must not copytoz, logs=%v", logs)
		}
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

// TestIncrementalPeerOnlyIdleAfterCopytoz reproduces the player-reset loop:
// after copytoz, dest (zedcafe) mtime often cannot follow Chtimes. The
// incremental apply must record remote (source) meta in the baseline so a
// stable peer file does not re-copytoz every tick.
func TestIncrementalPeerOnlyIdleAfterCopytoz(t *testing.T) {
	ResetJournalRevForTest()
	skipchtimesfortest = true
	defer func() { skipchtimesfortest = false }()

	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	rel := "demo-book1/page/board/terrain.json"
	body := `[{"kind":"empty"}]`
	writefile(t, remote, rel, body, mtime)
	writefile(t, zedcafe, rel, body, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}

	newer := time.Now()
	edited := `[{"kind":"water"}]`
	writefile(t, remote, rel, edited, newer)

	next, logs, err := steadytickincrementalpeeronly(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 1 || !strings.Contains(logs[0], "update zedcafe") {
		t.Fatalf("first tick logs=%v want one copytoz", logs)
	}
	remotemeta, err := statmeta(remote, rel)
	if err != nil {
		t.Fatal(err)
	}
	basemeta, ok := next[rel]
	if !ok {
		t.Fatal("baseline missing path after copytoz")
	}
	if !basemeta.Mtime.Equal(remotemeta.Mtime) {
		t.Fatalf("baseline mtime=%v want remote=%v (must prefer source meta)", basemeta.Mtime, remotemeta.Mtime)
	}

	// Dest mtime drifted (failed Chtimes); peer file unchanged.
	writefile(t, zedcafe, rel, edited, time.Now().Add(time.Hour))

	_, logs2, err := steadytickincrementalpeeronly(remote, zedcafe, next)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs2) != 0 {
		t.Fatalf("second tick must be idle after stable peer file, logs=%v", logs2)
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

func TestCopytozSkippedWhenContentEqualMtimeDrift(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	old := time.Now().Add(-time.Hour)
	body := `[{"kind":"empty"}]`
	rel := "demo-book1/page/board/terrain.json"
	writefile(t, remote, rel, body, old)
	writefile(t, zedcafe, rel, body, old)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// Peer mtime drift only; bytes unchanged on both sides.
	remotepath := filepath.Join(remote, filepath.FromSlash(rel))
	if err := os.Chtimes(remotepath, time.Now(), time.Now()); err != nil {
		t.Fatal(err)
	}

	next, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 1 || !strings.Contains(logs[0], "skip copytoz (unchanged)") {
		t.Fatalf("logs=%v want skip copytoz", logs)
	}
	journal, err := os.ReadFile(filepath.Join(remote, filepath.FromSlash(JournalFile)))
	if err != nil && !os.IsNotExist(err) {
		t.Fatal(err)
	}
	if len(journal) > 0 {
		t.Fatalf("expected no journal lines on skip, got %q", journal)
	}
	remotemeta, err := statmeta(remote, rel)
	if err != nil {
		t.Fatal(err)
	}
	if !next[rel].Mtime.Equal(remotemeta.Mtime) {
		t.Fatalf("baseline mtime=%v want remote=%v", next[rel].Mtime, remotemeta.Mtime)
	}

	_, logs2, err := SteadyTick(remote, zedcafe, next)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs2) != 0 {
		t.Fatalf("second tick must be idle, logs=%v", logs2)
	}
}

func TestCopytorSkippedWhenContentEqualMtimeDrift(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	old := time.Now().Add(-time.Hour)
	body := `{"score":9}`
	rel := "book/a.json"
	writefile(t, remote, rel, body, old)
	writefile(t, zedcafe, rel, body, old)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	// Zedcafe newer than remote, but remote already has the same bytes.
	edited := `{"score":99}`
	remoteMtime := time.Now().Add(-time.Minute)
	zedMtime := time.Now()
	writefile(t, remote, rel, edited, remoteMtime)
	writefile(t, zedcafe, rel, edited, zedMtime)

	next, logs, err := SteadyTick(remote, zedcafe, baseline)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 1 || !strings.Contains(logs[0], "skip copytor (unchanged)") {
		t.Fatalf("logs=%v want skip copytor", logs)
	}
	journal, err := os.ReadFile(filepath.Join(remote, filepath.FromSlash(JournalFile)))
	if err != nil && !os.IsNotExist(err) {
		t.Fatal(err)
	}
	if len(journal) > 0 {
		t.Fatalf("expected no journal lines on skip, got %q", journal)
	}
	if _, ok := next[rel]; !ok {
		t.Fatal("baseline missing path after skip")
	}
}

func TestPartialApplyUpdatesBaselineOnFailure(t *testing.T) {
	ResetJournalRevForTest()
	SetJournalCopyFailOnRelForTest("b.json")
	defer ClearJournalCopyFailOnRelForTest()

	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "a.json", `a`, mtime)
	writefile(t, remote, "b.json", `b`, mtime)

	ops := []syncop{
		{rel: "a.json", kind: "copytoz", logmsg: "create zedcafe <- a.json"},
		{rel: "b.json", kind: "copytoz", logmsg: "create zedcafe <- b.json"},
	}
	partial, logs, err := applyscopedops(remote, zedcafe, ops, Snapshot{})
	if err == nil {
		t.Fatal("expected error on second copytoz")
	}
	if !strings.Contains(err.Error(), "b.json") {
		t.Fatalf("err=%v", err)
	}
	if _, ok := partial["a.json"]; !ok {
		t.Fatalf("partial missing a.json logs=%v", logs)
	}
	if _, ok := partial["b.json"]; ok {
		t.Fatal("b.json should not be in partial baseline")
	}
	abody, err := os.ReadFile(filepath.Join(zedcafe, "a.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(abody) != "a" {
		t.Fatalf("a.json body=%q", abody)
	}
	if _, err := os.Stat(filepath.Join(zedcafe, "b.json")); !os.IsNotExist(err) {
		t.Fatal("b.json should not have been copied")
	}

	ClearJournalCopyFailOnRelForTest()
	_, logs2, err := SteadyTick(remote, zedcafe, partial)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs2) != 1 || !strings.Contains(logs2[0], "b.json") {
		t.Fatalf("second tick should only copy b.json, logs=%v", logs2)
	}
	for _, line := range logs2 {
		if strings.Contains(line, "a.json") {
			t.Fatalf("must not re-schedule a.json, logs=%v", logs2)
		}
	}
}

func TestFullTickEveryConstant(t *testing.T) {
	if FullTickEvery != 30 {
		t.Fatalf("FullTickEvery=%d want 30", FullTickEvery)
	}
}

func TestUseFullTick(t *testing.T) {
	if UseFullTick(0) {
		t.Fatal("poll 0 must not full-tick")
	}
	if UseFullTick(1) {
		t.Fatal("poll 1 must be incremental")
	}
	if !UseFullTick(FullTickEvery) {
		t.Fatalf("poll %d must full-tick", FullTickEvery)
	}
	if !UseFullTick(FullTickEvery * 2) {
		t.Fatalf("poll %d must full-tick", FullTickEvery*2)
	}
	if UseFullTick(FullTickEvery + 1) {
		t.Fatal("off-cycle poll must be incremental")
	}
}

func TestIsPlayerFlagPath(t *testing.T) {
	if !isplayerflagpath("book/flags/pid_1.json") {
		t.Fatal("expected player flag path")
	}
	if isplayerflagpath("book/flags/pid_1_chip.json") {
		t.Fatal("sim-only chip must not count as player flag for copytoz block")
	}
	if isplayerflagpath("book/page/board/objects/pid_1.json") {
		t.Fatal("board objects are not flag paths")
	}
	if !isplayerobjectpath("book/page/board/objects/pid_1.json") {
		t.Fatal("expected player object path")
	}
	if isplayerobjectpath("book/flags/pid_1.json") {
		t.Fatal("flags are not board object paths")
	}
	if allowcopytoz("book/page/board/objects/pid_1.json") {
		t.Fatal("player objects must not allow copytoz")
	}
}

func TestPlanopNeverCopytozPlayerFlags(t *testing.T) {
	rel := "demo-book1/flags/pid_1.json"
	now := time.Now().UTC()
	older := now.Add(-time.Hour)
	bm := FileMeta{Rel: rel, Size: 2, Mtime: older}
	rm := FileMeta{Rel: rel, Size: 3, Mtime: now} // peer strictly newer
	zm := FileMeta{Rel: rel, Size: 2, Mtime: older}
	op, needed := planop(rel, bm, true, rm, true, zm, true)
	if needed {
		t.Fatalf("player flags must not copytoz, got %+v", op)
	}
	// copytor still allowed when zedcafe is the only change
	rm2 := FileMeta{Rel: rel, Size: 2, Mtime: older}
	zm2 := FileMeta{Rel: rel, Size: 9, Mtime: now}
	op, needed = planop(rel, bm, true, rm2, true, zm2, true)
	if !needed || op.kind != "copytor" {
		t.Fatalf("want copytor when zedcafe newer, got needed=%v op=%+v", needed, op)
	}
}

func TestPlanopEqualMtimePrefersZedcafe(t *testing.T) {
	rel := "book/a.json"
	now := time.Now().UTC()
	older := now.Add(-time.Hour)
	bm := FileMeta{Rel: rel, Size: 1, Mtime: older}
	same := now
	rm := FileMeta{Rel: rel, Size: 10, Mtime: same}
	zm := FileMeta{Rel: rel, Size: 20, Mtime: same}
	op, needed := planop(rel, bm, true, rm, true, zm, true)
	if !needed || op.kind != "copytor" {
		t.Fatalf("equal mtime conflict must prefer zedcafe copytor, got needed=%v op=%+v", needed, op)
	}
	// Peer strictly newer still copytoz
	rm2 := FileMeta{Rel: rel, Size: 10, Mtime: now.Add(time.Minute)}
	zm2 := FileMeta{Rel: rel, Size: 20, Mtime: now}
	op, needed = planop(rel, bm, true, rm2, true, zm2, true)
	if !needed || op.kind != "copytoz" {
		t.Fatalf("strictly newer peer must copytoz, got needed=%v op=%+v", needed, op)
	}
}

func TestSeedSkipsCopytozPlayerFlags(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(filepath.Join(remote, "book", "flags"), 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now()
	writefile(t, remote, "book/flags/pid_1.json", `{"ammo":1}`, mtime)
	r, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	z := Snapshot{}
	n, err := InitialSeed(remote, zedcafe, r, z)
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("seed copied %d files, want 0 (player flags blocked)", n)
	}
	if _, err := os.Stat(filepath.Join(zedcafe, "book", "flags", "pid_1.json")); !os.IsNotExist(err) {
		t.Fatal("player flags must not land in zedcafe from empty-zedcafe seed")
	}
}
