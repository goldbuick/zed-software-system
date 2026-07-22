package zedsync

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestAppendJournalWritesNDJSONLines(t *testing.T) {
	dir := t.TempDir()
	entry1 := JournalEntry{
		Rev: 1, Op: "copytoz", Path: "a.json", Sha256: "abc",
		Ts: time.Now().UTC().Format(time.RFC3339Nano), Status: JournalStatusPending,
	}
	entry2 := JournalEntry{
		Rev: 1, Op: "copytoz", Path: "a.json", Sha256: "abc",
		Ts: time.Now().UTC().Format(time.RFC3339Nano), Status: JournalStatusDone,
	}
	if err := AppendJournal(dir, entry1); err != nil {
		t.Fatal(err)
	}
	if err := AppendJournal(dir, entry2); err != nil {
		t.Fatal(err)
	}
	entries, err := ReadJournalEntries(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 2 {
		t.Fatalf("entries=%d want 2: %+v", len(entries), entries)
	}
	if entries[0].Status != JournalStatusPending || entries[1].Status != JournalStatusDone {
		t.Fatalf("unexpected statuses: %+v", entries)
	}
	if entries[0].Path != "a.json" || entries[0].Sha256 != "abc" {
		t.Fatalf("unexpected entry: %+v", entries[0])
	}
}

func TestReadJournalEntriesMissingFileReturnsEmpty(t *testing.T) {
	dir := t.TempDir()
	entries, err := ReadJournalEntries(dir)
	if err != nil {
		t.Fatal(err)
	}
	if entries != nil {
		t.Fatalf("expected nil entries, got %+v", entries)
	}
}

func TestSyncStateRoundTrip(t *testing.T) {
	dir := t.TempDir()
	empty, err := ReadSyncState(dir)
	if err != nil {
		t.Fatal(err)
	}
	if empty != (SyncState{}) {
		t.Fatalf("expected zero state, got %+v", empty)
	}
	want := SyncState{LastRemoteRev: 3, LastZedcafeRev: 5}
	if err := WriteSyncState(dir, want); err != nil {
		t.Fatal(err)
	}
	got, err := ReadSyncState(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("got=%+v want=%+v", got, want)
	}
}

func TestWalkFilesSkipsJournalDir(t *testing.T) {
	dir := t.TempDir()
	if err := AppendJournal(dir, JournalEntry{Rev: 1, Op: "copytoz", Path: "a.json", Status: JournalStatusDone}); err != nil {
		t.Fatal(err)
	}
	if err := WriteSyncState(dir, SyncState{LastRemoteRev: 1}); err != nil {
		t.Fatal(err)
	}
	writefile(t, dir, "a.json", `1`, time.Now())
	snap, err := WalkFiles(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := snap[JournalFile]; ok {
		t.Fatal("journal file should be skipped by WalkFiles")
	}
	if _, ok := snap[StateFile]; ok {
		t.Fatal("state file should be skipped by WalkFiles")
	}
	if _, ok := snap["a.json"]; !ok {
		t.Fatal("missing a.json")
	}
}

func TestJournalcopyAppendsPendingThenDoneAndCopies(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	writefile(t, zedcafe, "a.json", `{"a":1}`, time.Now())

	rev, err := journalcopy(remote, zedcafe, remote, "copytor", "a.json", nil)
	if err != nil {
		t.Fatal(err)
	}
	if rev != 1 {
		t.Fatalf("rev=%d want 1", rev)
	}
	body, err := os.ReadFile(filepath.Join(remote, "a.json"))
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != `{"a":1}` {
		t.Fatalf("body=%q", body)
	}
	entries, err := ReadJournalEntries(remote)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 2 {
		t.Fatalf("entries=%d want 2: %+v", len(entries), entries)
	}
	if entries[0].Status != JournalStatusPending || entries[1].Status != JournalStatusDone {
		t.Fatalf("unexpected statuses: %+v", entries)
	}
	if entries[0].Sha256 == "" {
		t.Fatal("expected non-empty sha256")
	}
}

func TestInitialSeedWritesSyncState(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	writefile(t, zedcafe, "a.json", `1`, time.Now())

	r, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	z, err := WalkFiles(zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := InitialSeed(remote, zedcafe, r, z); err != nil {
		t.Fatal(err)
	}
	state, err := ReadSyncState(remote)
	if err != nil {
		t.Fatal(err)
	}
	if state.LastRemoteRev == 0 {
		t.Fatalf("expected LastRemoteRev to be set, got %+v", state)
	}
}

func TestSteadyTickWritesSyncState(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	mtime := time.Now().Add(-time.Minute)
	writefile(t, remote, "x.json", `1`, mtime)
	writefile(t, zedcafe, "x.json", `1`, mtime)
	baseline, err := WalkFiles(remote)
	if err != nil {
		t.Fatal(err)
	}
	writefile(t, remote, "x.json", `2`, time.Now())

	if _, _, err := SteadyTick(remote, zedcafe, baseline); err != nil {
		t.Fatal(err)
	}
	state, err := ReadSyncState(remote)
	if err != nil {
		t.Fatal(err)
	}
	if state.LastZedcafeRev == 0 {
		t.Fatalf("expected LastZedcafeRev to be set, got %+v", state)
	}
}

func TestReplayIncompleteJournalRecoversPendingCopytor(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	writefile(t, zedcafe, "a.json", `{"a":1}`, time.Now())

	// Simulate a crash between the pending journal append and the copy: the
	// journal says copytor is pending, but the file never landed on remote.
	if err := AppendJournal(remote, JournalEntry{
		Rev: nextjournalrev(), Op: "copytor", Path: "a.json",
		Ts: time.Now().UTC().Format(time.RFC3339Nano), Status: JournalStatusPending,
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(remote, "a.json")); !os.IsNotExist(err) {
		t.Fatalf("expected a.json missing on remote before replay, err=%v", err)
	}

	logs, err := ReplayIncompleteJournal(remote, zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 1 {
		t.Fatalf("logs=%v want 1 entry", logs)
	}
	body, err := os.ReadFile(filepath.Join(remote, "a.json"))
	if err != nil {
		t.Fatalf("expected a.json recovered on remote: %v", err)
	}
	if string(body) != `{"a":1}` {
		t.Fatalf("body=%q", body)
	}

	// A second replay should see the entry as done and skip it.
	logs2, err := ReplayIncompleteJournal(remote, zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs2) != 0 {
		t.Fatalf("expected no-op second replay, got %v", logs2)
	}
}

func TestReplayIncompleteJournalNoopWhenNoJournal(t *testing.T) {
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	logs, err := ReplayIncompleteJournal(remote, zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 0 {
		t.Fatalf("expected no logs, got %v", logs)
	}
}

func TestReplayIncompleteJournalHighRevWithGaps(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	remote := filepath.Join(dir, "remote")
	zedcafe := filepath.Join(dir, "zedcafe")
	_ = os.MkdirAll(remote, 0o755)
	_ = os.MkdirAll(zedcafe, 0o755)
	writefile(t, zedcafe, "high.json", `{"n":500}`, time.Now())

	// Only three map entries, but pending rev is 500 -- old loop used
	// len(latestbyrev) and skipped it.
	for _, e := range []JournalEntry{
		{Rev: 1, Op: "copytor", Path: "a.json", Status: JournalStatusDone},
		{Rev: 2, Op: "copytor", Path: "b.json", Status: JournalStatusDone},
		{Rev: 500, Op: "copytor", Path: "high.json", Status: JournalStatusPending},
	} {
		e.Ts = time.Now().UTC().Format(time.RFC3339Nano)
		if err := AppendJournal(remote, e); err != nil {
			t.Fatal(err)
		}
	}

	logs, err := ReplayIncompleteJournal(remote, zedcafe)
	if err != nil {
		t.Fatal(err)
	}
	if len(logs) != 1 || !strings.Contains(logs[0], "high.json") {
		t.Fatalf("expected recover high.json, logs=%v", logs)
	}
	if _, err := os.Stat(filepath.Join(remote, "high.json")); err != nil {
		t.Fatalf("high.json missing after replay: %v", err)
	}
}

func TestSeedJournalRevFromDiskContinuesAboveMax(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	for _, e := range []JournalEntry{
		{Rev: 10, Op: "copytoz", Path: "a.json", Status: JournalStatusDone},
		{Rev: 42, Op: "copytoz", Path: "b.json", Status: JournalStatusDone},
	} {
		e.Ts = time.Now().UTC().Format(time.RFC3339Nano)
		if err := AppendJournal(dir, e); err != nil {
			t.Fatal(err)
		}
	}
	if err := SeedJournalRevFromDisk(dir); err != nil {
		t.Fatal(err)
	}
	got := nextjournalrev()
	if got != 43 {
		t.Fatalf("nextjournalrev=%d want 43", got)
	}
}

func TestCompactJournalDropsResolvedKeepsPending(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	for _, e := range []JournalEntry{
		{Rev: 1, Op: "copytoz", Path: "a.json", Status: JournalStatusPending},
		{Rev: 1, Op: "copytoz", Path: "a.json", Status: JournalStatusDone},
		{Rev: 2, Op: "copytor", Path: "b.json", Status: JournalStatusPending},
		{Rev: 3, Op: "copytoz", Path: "c.json", Status: JournalStatusPending},
		{Rev: 3, Op: "copytoz", Path: "c.json", Status: JournalStatusDone},
	} {
		e.Ts = time.Now().UTC().Format(time.RFC3339Nano)
		if err := AppendJournal(dir, e); err != nil {
			t.Fatal(err)
		}
	}
	if err := CompactJournal(dir); err != nil {
		t.Fatal(err)
	}
	entries, err := ReadJournalEntries(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("entries=%+v want only pending rev 2", entries)
	}
	if entries[0].Rev != 2 || entries[0].Status != JournalStatusPending {
		t.Fatalf("unexpected entry %+v", entries[0])
	}
}

func TestCompactJournalFullyResolvedBecomesEmpty(t *testing.T) {
	ResetJournalRevForTest()
	dir := t.TempDir()
	for _, e := range []JournalEntry{
		{Rev: 1, Op: "copytoz", Path: "a.json", Status: JournalStatusPending},
		{Rev: 1, Op: "copytoz", Path: "a.json", Status: JournalStatusDone},
	} {
		e.Ts = time.Now().UTC().Format(time.RFC3339Nano)
		if err := AppendJournal(dir, e); err != nil {
			t.Fatal(err)
		}
	}
	if err := CompactJournal(dir); err != nil {
		t.Fatal(err)
	}
	entries, err := ReadJournalEntries(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected empty journal, got %+v", entries)
	}
}
