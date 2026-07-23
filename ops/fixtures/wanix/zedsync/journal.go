package zedsync

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	// JournalDir is the peer-side metadata directory (skipped by WalkFiles --
	// RevisionDir / JournalDir segment, see shouldskip).
	JournalDir = "zedsync"
	// JournalFile is an append-only NDJSON log of copy ops, written before
	// each copy so an interrupted sync can be replayed on restart.
	JournalFile = "zedsync/journal.ndjson"
	// StateFile tracks the last-seen revision on each side for restart
	// recovery.
	StateFile = "zedsync/state.json"
)

// JournalEntryStatus values for JournalEntry.Status.
const (
	JournalStatusPending = "pending"
	JournalStatusDone    = "done"
)

// JournalEntry is one NDJSON line recorded before (status=pending) and after
// (status=done) a copy, so ReplayIncompleteJournal can find ops that never
// finished (last line for a given rev is still "pending").
type JournalEntry struct {
	Rev    int    `json:"rev"`
	Op     string `json:"op"` // "copytoz" | "copytor"
	Path   string `json:"path"`
	Sha256 string `json:"sha256"`
	Ts     string `json:"ts"`
	Status string `json:"status"`
}

// SyncState is the peer-side `{ lastRemoteRev, lastZedcafeRev }` restart hint.
type SyncState struct {
	LastRemoteRev  int `json:"lastRemoteRev"`
	LastZedcafeRev int `json:"lastZedcafeRev"`
}

var journalrevcounter int

// nextjournalrev returns a monotonic per-process journal revision number.
func nextjournalrev() int {
	journalrevcounter++
	return journalrevcounter
}

// ResetJournalRevForTest resets the in-process journal revision counter.
func ResetJournalRevForTest() {
	journalrevcounter = 0
}

// SeedJournalRevFromDisk sets the in-process journal revision counter to the
// max rev already present in <remote>/zedsync/journal.ndjson so a restart
// never reuses old rev numbers (latestbyrev is last-wins per rev).
func SeedJournalRevFromDisk(remote string) error {
	entries, err := ReadJournalEntries(remote)
	if err != nil {
		return err
	}
	maxrev := 0
	for _, entry := range entries {
		if entry.Rev > maxrev {
			maxrev = entry.Rev
		}
	}
	journalrevcounter = maxrev
	return nil
}

// CompactJournal rewrites <remote>/zedsync/journal.ndjson keeping only
// entries whose latest status (by rev) is still "pending". Fully resolved
// pending/done pairs are dropped so the file cannot grow without bound.
func CompactJournal(remote string) error {
	entries, err := ReadJournalEntries(remote)
	if err != nil {
		return err
	}
	if len(entries) == 0 {
		return nil
	}
	latestbyrev := map[int]JournalEntry{}
	for _, entry := range entries {
		latestbyrev[entry.Rev] = entry
	}
	pending := make([]JournalEntry, 0)
	for _, entry := range latestbyrev {
		if entry.Status == JournalStatusPending {
			pending = append(pending, entry)
		}
	}
	path := filepath.Join(remote, JournalFile)
	if len(pending) == 0 {
		if err := os.WriteFile(path, nil, 0o644); err != nil {
			return fmt.Errorf("compact journal %s: %w", path, err)
		}
		return nil
	}
	sort.Slice(pending, func(i, j int) bool {
		return pending[i].Rev < pending[j].Rev
	})
	var buf strings.Builder
	for _, entry := range pending {
		line, merr := json.Marshal(entry)
		if merr != nil {
			return fmt.Errorf("marshal journal entry: %w", merr)
		}
		buf.Write(line)
		buf.WriteByte('\n')
	}
	if err := os.WriteFile(path, []byte(buf.String()), 0o644); err != nil {
		return fmt.Errorf("compact journal %s: %w", path, err)
	}
	return nil
}

// filesha256 hashes the bytes of path (hex-encoded), for journal entries.
func filesha256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", fmt.Errorf("hash %s: %w", path, err)
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// AppendJournal appends one NDJSON entry to <remote>/zedsync/journal.ndjson.
func AppendJournal(remote string, entry JournalEntry) error {
	dir := filepath.Join(remote, JournalDir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", dir, err)
	}
	line, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("marshal journal entry: %w", err)
	}
	path := filepath.Join(remote, JournalFile)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("open journal %s: %w", path, err)
	}
	defer f.Close()
	if _, err := f.Write(append(line, '\n')); err != nil {
		return fmt.Errorf("append journal %s: %w", path, err)
	}
	return nil
}

// journalcopy hashes the source file, appends a pending journal entry on
// remote, performs the copy, then appends a matching done entry. Returns the
// journal revision used, for the caller to fold into SyncState.
// srcroot/dstroot are (remote, zedcafe) for op="copytoz" or (zedcafe, remote)
// for op="copytor" -- the journal always lives under remote regardless of
// copy direction (peer-side journal).
// journalcopyfailonrel makes journalcopy fail for rel (tests only).
var journalcopyfailonrel string

// SetJournalCopyFailOnRelForTest fails journalcopy for rel until cleared.
func SetJournalCopyFailOnRelForTest(rel string) {
	journalcopyfailonrel = rel
}

// ClearJournalCopyFailOnRelForTest clears the journalcopy test failure hook.
func ClearJournalCopyFailOnRelForTest() {
	journalcopyfailonrel = ""
}

func journalcopy(remote, srcroot, dstroot, op, rel string, madedirs map[string]struct{}) (rev int, err error) {
	if journalcopyfailonrel != "" && rel == journalcopyfailonrel {
		return 0, fmt.Errorf("journal copy fail on %s (test hook)", rel)
	}
	src := filepath.Join(srcroot, filepath.FromSlash(rel))
	sum, err := filesha256(src)
	if err != nil {
		return 0, fmt.Errorf("journal sha256 %s: %w", rel, err)
	}
	rev = nextjournalrev()
	entry := JournalEntry{
		Rev:    rev,
		Op:     op,
		Path:   rel,
		Sha256: sum,
		Ts:     time.Now().UTC().Format(time.RFC3339Nano),
		Status: JournalStatusPending,
	}
	if err := AppendJournal(remote, entry); err != nil {
		return rev, fmt.Errorf("journal pending %s: %w", rel, err)
	}
	if err := copyfilecached(srcroot, dstroot, rel, madedirs); err != nil {
		return rev, err
	}
	entry.Status = JournalStatusDone
	entry.Ts = time.Now().UTC().Format(time.RFC3339Nano)
	if err := AppendJournal(remote, entry); err != nil {
		return rev, fmt.Errorf("journal done %s: %w", rel, err)
	}
	return rev, nil
}

// ReadSyncState reads <remote>/zedsync/state.json, or the zero value if absent.
func ReadSyncState(remote string) (SyncState, error) {
	path := filepath.Join(remote, StateFile)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return SyncState{}, nil
		}
		return SyncState{}, fmt.Errorf("read state %s: %w", path, err)
	}
	var state SyncState
	if err := json.Unmarshal(data, &state); err != nil {
		return SyncState{}, fmt.Errorf("parse state %s: %w", path, err)
	}
	return state, nil
}

// WriteSyncState writes <remote>/zedsync/state.json.
func WriteSyncState(remote string, state SyncState) error {
	dir := filepath.Join(remote, JournalDir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", dir, err)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal state: %w", err)
	}
	path := filepath.Join(remote, StateFile)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write state %s: %w", path, err)
	}
	return nil
}

// ReadJournalEntries reads all NDJSON lines from <remote>/zedsync/journal.ndjson.
// A missing journal returns (nil, nil), not an error.
func ReadJournalEntries(remote string) ([]JournalEntry, error) {
	path := filepath.Join(remote, JournalFile)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read journal %s: %w", path, err)
	}
	trimmed := strings.TrimRight(string(data), "\n")
	if trimmed == "" {
		return nil, nil
	}
	lines := strings.Split(trimmed, "\n")
	entries := make([]JournalEntry, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		var entry JournalEntry
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			return nil, fmt.Errorf("parse journal line %q: %w", line, err)
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// ReplayIncompleteJournal best-effort re-copies ops whose last recorded
// journal entry (by rev) is still "pending" -- i.e. the process stopped
// between the pending append and the copy completing. Call on startup,
// before InitialSeed. Individual copy failures are collected into logs and
// do not abort the rest of the replay. After replay, the in-process rev
// counter is seeded from the journal max rev so new copies never collide.
func ReplayIncompleteJournal(remote, zedcafe string) (logs []string, err error) {
	entries, rerr := ReadJournalEntries(remote)
	if rerr != nil {
		return nil, rerr
	}
	if len(entries) == 0 {
		journalrevcounter = 0
		return nil, nil
	}
	latestbyrev := map[int]JournalEntry{}
	maxrev := 0
	for _, entry := range entries {
		latestbyrev[entry.Rev] = entry
		if entry.Rev > maxrev {
			maxrev = entry.Rev
		}
	}
	madedirs := map[string]struct{}{}
	for rev := 1; rev <= maxrev; rev++ {
		entry, ok := latestbyrev[rev]
		if !ok || entry.Status != JournalStatusPending {
			continue
		}
		var cerr error
		switch entry.Op {
		case "copytoz":
			cerr = copyfilecached(remote, zedcafe, entry.Path, madedirs)
		case "copytor":
			cerr = copyfilecached(zedcafe, remote, entry.Path, madedirs)
		default:
			logs = append(logs, fmt.Sprintf("replay: unknown op %q for %s (skipped)", entry.Op, entry.Path))
			continue
		}
		if cerr != nil {
			logs = append(logs, fmt.Sprintf("replay %s %s failed: %v", entry.Op, entry.Path, cerr))
			continue
		}
		if aerr := AppendJournal(remote, JournalEntry{
			Rev:    entry.Rev,
			Op:     entry.Op,
			Path:   entry.Path,
			Sha256: entry.Sha256,
			Ts:     time.Now().UTC().Format(time.RFC3339Nano),
			Status: JournalStatusDone,
		}); aerr != nil {
			logs = append(logs, fmt.Sprintf("replay %s %s: journal done write failed: %v", entry.Op, entry.Path, aerr))
			continue
		}
		logs = append(logs, fmt.Sprintf("replay %s %s: recovered", entry.Op, entry.Path))
	}
	// Seed after replay so done-appends for recovered revs are included in max.
	if serr := SeedJournalRevFromDisk(remote); serr != nil {
		return logs, serr
	}
	return logs, nil
}
