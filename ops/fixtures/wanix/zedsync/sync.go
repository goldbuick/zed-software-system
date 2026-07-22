package zedsync

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	ZedcafeMount  = "zedcafe"
	PollInterval  = 1 * time.Second
	PollIdleMax   = 4 * time.Second
	SeedProgressEvery = 100
	// RevisionDir mirrors WANIX_ZEDSYNC_REVISION_DIR in wanixzedcafeconstants.ts.
	// Host (zedcafehost.ts pushzedcafeexportlive) writes RevisionFile after each
	// push. ReadySentinel lives under the same meta dir (not a top-level peer file).
	RevisionDir   = ".zedsync"
	RevisionFile  = ".zedsync/revision"
	ReadySentinel = ".zedsync/ready"
)

// ErrZedsyncNeedFullTick signals that SteadyTickIncremental could not apply
// a scoped update (revision file missing/unparseable, or bumped with no
// path list) -- the documented primary recovery path is for the caller
// (cmd/main.go) to fall back to the full SteadyTick, not a silent retry.
var ErrZedsyncNeedFullTick = errors.New("zedsync: incremental state incomplete, need full tick")

// LastWalkCount is the number of WalkFiles calls in the most recent SteadyTick.
var LastWalkCount int

// steadyticktesthook runs at the start of SteadyTick (tests only).
var steadyticktesthook func()

func reportseedprogress(copied, total int) {
	if total <= 0 || copied <= 0 {
		return
	}
	if copied == total || copied%SeedProgressEvery == 0 {
		fmt.Printf("zedsync: seed progress %d/%d\n", copied, total)
	}
}

// FileMeta is a relative-path fingerprint for sync decisions.
type FileMeta struct {
	Rel   string
	Size  int64
	Mtime time.Time
}

// Snapshot maps relative slash paths to file metadata (files only).
type Snapshot map[string]FileMeta

// shouldskip reports whether a slash-normalized relative path is non-content
// (any path segment starts with '.' -- dotfiles, hidden dirs, ready sentinel;
// sim-only flag bags under flags/ are never synced; player board objects
// board/objects/pid_*.json are never synced).
func shouldskip(rel string) bool {
	for _, seg := range strings.Split(rel, "/") {
		if strings.HasPrefix(seg, ".") {
			return true
		}
	}
	if strings.Contains(rel, "/flags/") {
		base := filepath.Base(rel)
		for _, suf := range []string{
			"_chip.json",
			"_gadget.json",
			"_synth.json",
			"_layers.json",
			"_tracking.json",
		} {
			if strings.HasSuffix(base, suf) {
				return true
			}
		}
	}
	if strings.Contains(rel, "/board/objects/") {
		base := filepath.Base(rel)
		if strings.HasPrefix(base, "pid_") && strings.HasSuffix(base, ".json") {
			return true
		}
	}
	return false
}

// WalkFiles walks root and returns a snapshot of regular files.
func WalkFiles(root string) (Snapshot, error) {
	out := Snapshot{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			rel, rerr := filepath.Rel(root, path)
			if rerr == nil && shouldskip(filepath.ToSlash(rel)) {
				if d != nil && d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
			return err
		}
		rel, rerr := filepath.Rel(root, path)
		if rerr != nil {
			return rerr
		}
		rel = filepath.ToSlash(rel)
		if d.IsDir() {
			// Never SkipDir the walk root (rel == "."); still skip hidden children.
			if rel != "." && shouldskip(rel) {
				return filepath.SkipDir
			}
			return nil
		}
		if shouldskip(rel) {
			return nil
		}
		info, ierr := d.Info()
		if ierr != nil {
			return ierr
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		out[rel] = FileMeta{
			Rel:   rel,
			Size:  info.Size(),
			Mtime: info.ModTime().UTC(),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

func copyfilecached(srcroot, dstroot, rel string, madedirs map[string]struct{}) error {
	src := filepath.Join(srcroot, filepath.FromSlash(rel))
	dst := filepath.Join(dstroot, filepath.FromSlash(rel))
	parent := filepath.Dir(dst)
	if madedirs == nil {
		if err := os.MkdirAll(parent, 0o755); err != nil {
			return fmt.Errorf("mkdir %s: %w", parent, err)
		}
	} else if _, ok := madedirs[parent]; !ok {
		if err := os.MkdirAll(parent, 0o755); err != nil {
			return fmt.Errorf("mkdir %s: %w", parent, err)
		}
		madedirs[parent] = struct{}{}
	}
	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open %s: %w", src, err)
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("create %s: %w", dst, err)
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return fmt.Errorf("copy %s -> %s: %w", src, dst, err)
	}
	// Best-effort mtime preserve. Browser/gojs mounts often cannot Chtimes;
	// SteadyTick treats equal-size mtime-only drift as idle to avoid churn.
	// skipchtimesfortest simulates that failure so incremental baseline tests
	// can assert we record the remote (source) meta, not the drifted dest.
	if !skipchtimesfortest {
		info, err := os.Stat(src)
		if err == nil {
			_ = os.Chtimes(dst, info.ModTime(), info.ModTime())
		}
	}
	return nil
}

// skipchtimesfortest is set by tests to simulate FSA/gojs mounts that cannot
// preserve source mtime after a copy (see TestIncrementalPeerOnlyIdleAfterCopytoz).
var skipchtimesfortest bool

func statmeta(root, rel string) (FileMeta, error) {
	path := filepath.Join(root, filepath.FromSlash(rel))
	info, err := os.Stat(path)
	if err != nil {
		return FileMeta{}, err
	}
	return FileMeta{
		Rel:   rel,
		Size:  info.Size(),
		Mtime: info.ModTime().UTC(),
	}, nil
}

func removefile(root, rel string) error {
	return removefiledeferred(root, rel, nil)
}

func removefiledeferred(root, rel string, prune *[]string) error {
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove %s: %w", rel, err)
	}
	if prune != nil {
		dir := filepath.Dir(path)
		if dir != root && strings.HasPrefix(dir, root) {
			*prune = append(*prune, dir)
		}
		return nil
	}
	// Best-effort prune empty parents under root.
	dir := filepath.Dir(path)
	for dir != root && strings.HasPrefix(dir, root) {
		if err := os.Remove(dir); err != nil {
			break
		}
		dir = filepath.Dir(dir)
	}
	return nil
}

func pruneemptydirs(dirs []string) {
	// deepest-first; ENOTEMPTY / non-empty is ignored (best-effort).
	sort.Slice(dirs, func(i, j int) bool {
		return len(dirs[i]) > len(dirs[j])
	})
	seen := map[string]struct{}{}
	for _, dir := range dirs {
		if _, ok := seen[dir]; ok {
			continue
		}
		seen[dir] = struct{}{}
		_ = os.Remove(dir)
	}
}

func newer(a, b FileMeta) bool {
	if a.Mtime.After(b.Mtime) {
		return true
	}
	if a.Mtime.Equal(b.Mtime) {
		return a.Size != b.Size
	}
	return false
}

// sizealigned reports same length -- used to ignore mtime-only drift after
// copies onto FS backends that cannot Chtimes (gojs export mounts).
func sizealigned(a, b FileMeta) bool {
	return a.Size == b.Size
}

// InitialSeed copies between remote and zedcafe without deletes.
// Empty remote + non-empty zedcafe seeds remote from zedcafe.
// Every copy is journaled on remote (see journal.go); state.json is updated
// once at the end when at least one file copied.
func InitialSeed(remote, zedcafe string, r, z Snapshot) (copied int, err error) {
	state, serr := ReadSyncState(remote)
	if serr != nil {
		return 0, fmt.Errorf("read sync state: %w", serr)
	}
	madedirs := map[string]struct{}{}
	updatestate := func(op string, rev int) {
		if op == "copytor" {
			state.LastRemoteRev = rev
		} else {
			state.LastZedcafeRev = rev
		}
	}
	defer func() {
		if err == nil && copied > 0 {
			err = WriteSyncState(remote, state)
		}
	}()

	switch {
	case len(r) == 0 && len(z) > 0:
		total := len(z)
		for rel := range z {
			rev, cerr := journalcopy(remote, zedcafe, remote, "copytor", rel, madedirs)
			if cerr != nil {
				return copied, fmt.Errorf("seed remote %s: %w", rel, cerr)
			}
			updatestate("copytor", rev)
			copied++
			reportseedprogress(copied, total)
		}
	case len(z) == 0 && len(r) > 0:
		total := len(r)
		for rel := range r {
			rev, cerr := journalcopy(remote, remote, zedcafe, "copytoz", rel, madedirs)
			if cerr != nil {
				return copied, fmt.Errorf("seed zedcafe %s: %w", rel, cerr)
			}
			updatestate("copytoz", rev)
			copied++
			reportseedprogress(copied, total)
		}
	case len(r) == 0 && len(z) == 0:
		return 0, nil
	default:
		// Union seed: unique paths both ways; shared -> LWW (tie -> remote wins).
		all := map[string]struct{}{}
		for rel := range r {
			all[rel] = struct{}{}
		}
		for rel := range z {
			all[rel] = struct{}{}
		}
		total := len(all)
		for rel := range all {
			rm, rok := r[rel]
			zm, zok := z[rel]
			switch {
			case rok && !zok:
				rev, cerr := journalcopy(remote, remote, zedcafe, "copytoz", rel, madedirs)
				if cerr != nil {
					return copied, fmt.Errorf("seed copytoz %s: %w", rel, cerr)
				}
				updatestate("copytoz", rev)
				copied++
				reportseedprogress(copied, total)
			case zok && !rok:
				rev, cerr := journalcopy(remote, zedcafe, remote, "copytor", rel, madedirs)
				if cerr != nil {
					return copied, fmt.Errorf("seed copytor %s: %w", rel, cerr)
				}
				updatestate("copytor", rev)
				copied++
				reportseedprogress(copied, total)
			case rok && zok:
				if rm.Mtime.After(zm.Mtime) || (rm.Mtime.Equal(zm.Mtime) && rm.Size != zm.Size) {
					rev, cerr := journalcopy(remote, remote, zedcafe, "copytoz", rel, madedirs)
					if cerr != nil {
						return copied, fmt.Errorf("seed copytoz %s: %w", rel, cerr)
					}
					updatestate("copytoz", rev)
					copied++
					reportseedprogress(copied, total)
				} else if zm.Mtime.After(rm.Mtime) {
					rev, cerr := journalcopy(remote, zedcafe, remote, "copytor", rel, madedirs)
					if cerr != nil {
						return copied, fmt.Errorf("seed copytor %s: %w", rel, cerr)
					}
					updatestate("copytor", rev)
					copied++
					reportseedprogress(copied, total)
				}
			}
		}
	}
	return copied, nil
}

type syncop struct {
	rel    string
	kind   string // copytoz, copytor, deleteremote
	logmsg string
}

// planop derives the sync action (if any) for rel from baseline vs current
// remote/zedcafe presence+metadata.
//
// newer-mtime-wins: on create/update conflict (both sides present/changed),
// the side with the newer mtime wins. Equal mtime+size ties prefer peer
// (copytoz) so hand-edits are not silently discarded. See "Peer sync
// (zedsync)" > "Conflict policy: newer mtime wins" in feature/wanix/README.md.
func planop(
	rel string,
	bm FileMeta, binbase bool,
	rm FileMeta, rinremote bool,
	zm FileMeta, rinzed bool,
) (syncop, bool) {
	switch {
	case !binbase && rinremote && !rinzed:
		return syncop{rel, "copytoz", fmt.Sprintf("create zedcafe <- %s", rel)}, true
	case !binbase && rinzed && !rinremote:
		return syncop{rel, "copytor", fmt.Sprintf("create remote <- %s", rel)}, true
	case !binbase && rinremote && rinzed:
		// newer-mtime-wins; equal mtime ties prefer peer (copytoz).
		if newer(zm, rm) {
			return syncop{rel, "copytor", fmt.Sprintf("create/conflict remote <- zedcafe (newer) %s", rel)}, true
		}
		return syncop{rel, "copytoz", fmt.Sprintf("create/conflict zedcafe <- remote (newer) %s", rel)}, true
	case binbase && !rinremote && !rinzed:
		// already gone both sides
		return syncop{}, false
	case binbase && !rinremote && rinzed:
		return syncop{rel, "copytor", fmt.Sprintf("restore remote <- zedcafe %s", rel)}, true
	case binbase && rinremote && !rinzed:
		return syncop{rel, "deleteremote", fmt.Sprintf("delete remote <- gone on zedcafe %s", rel)}, true
	case binbase && rinremote && rinzed:
		remotechanged := newer(rm, bm) || rm.Size != bm.Size || !rm.Mtime.Equal(bm.Mtime)
		zedchanged := newer(zm, bm) || zm.Size != bm.Size || !zm.Mtime.Equal(bm.Mtime)
		if remotechanged && zedchanged {
			// newer-mtime-wins; equal mtime ties prefer peer (copytoz).
			if newer(zm, rm) {
				return syncop{rel, "copytor", fmt.Sprintf("conflict remote <- zedcafe (newer) %s", rel)}, true
			}
			return syncop{rel, "copytoz", fmt.Sprintf("conflict zedcafe <- remote (newer) %s", rel)}, true
		}
		if remotechanged {
			return syncop{rel, "copytoz", fmt.Sprintf("update zedcafe <- %s", rel)}, true
		}
		if zedchanged {
			// Mtime-only drift with equal size: browser FS after copytoz often
			// cannot Chtimes; do not churn remote <- zedcafe.
			if sizealigned(rm, zm) {
				return syncop{}, false
			}
			return syncop{rel, "copytor", fmt.Sprintf("update remote <- %s", rel)}, true
		}
	}
	return syncop{}, false
}

// sortops gives a deterministic plan: ordinary files before stats.json;
// sorted otherwise.
func sortops(ops []syncop) {
	sort.SliceStable(ops, func(i, j int) bool {
		istat := strings.HasSuffix(ops[i].rel, "/stats.json") || ops[i].rel == "stats.json"
		jstat := strings.HasSuffix(ops[j].rel, "/stats.json") || ops[j].rel == "stats.json"
		if istat != jstat {
			return !istat
		}
		return ops[i].rel < ops[j].rel
	})
}

// statmetaok stats rel under root; a missing file is reported as
// (FileMeta{}, false, nil) rather than an error.
func statmetaok(root, rel string) (FileMeta, bool, error) {
	m, err := statmeta(root, rel)
	if err != nil {
		if os.IsNotExist(err) {
			return FileMeta{}, false, nil
		}
		return FileMeta{}, false, err
	}
	return m, true, nil
}

// SteadyTick applies creates/updates both ways vs baseline.
// Deletes on remote are ignored: the file is restored from zedcafe.
// Deletes on zedcafe still remove the peer on remote.
// Performs two WalkFiles (remote + zedcafe); next baseline is built from
// in-memory side snapshots updated after successful mutations.
// Go/WASM JS FS panics are recovered into an error so the watcher keeps running.
func SteadyTick(remote, zedcafe string, baseline Snapshot) (snap Snapshot, logs []string, err error) {
	defer func() {
		if rec := recover(); rec != nil {
			snap = baseline
			logs = nil
			err = fmt.Errorf("zedsync panic during tick (will retry): %v", rec)
		}
	}()
	if steadyticktesthook != nil {
		steadyticktesthook()
	}
	return steadytickbody(remote, zedcafe, baseline)
}

func steadytickbody(remote, zedcafe string, baseline Snapshot) (Snapshot, []string, error) {
	LastWalkCount = 0
	r, err := WalkFiles(remote)
	if err != nil {
		return baseline, nil, fmt.Errorf("walk remote: %w", err)
	}
	LastWalkCount++
	z, err := WalkFiles(zedcafe)
	if err != nil {
		return baseline, nil, fmt.Errorf("walk zedcafe: %w", err)
	}
	LastWalkCount++

	all := map[string]struct{}{}
	for rel := range baseline {
		all[rel] = struct{}{}
	}
	for rel := range r {
		all[rel] = struct{}{}
	}
	for rel := range z {
		all[rel] = struct{}{}
	}

	ops := make([]syncop, 0, len(all))
	for rel := range all {
		bm, binbase := baseline[rel]
		rm, rinremote := r[rel]
		zm, rinzed := z[rel]
		if op, needed := planop(rel, bm, binbase, rm, rinremote, zm, rinzed); needed {
			ops = append(ops, op)
		}
	}
	sortops(ops)

	unified, logs, err := applyops(remote, zedcafe, ops, r, z, nil, false)
	return unified, logs, err
}

// filescontentequal reports whether rel has identical bytes under rootA and rootB.
func filescontentequal(rootA, rootB, rel string) (bool, error) {
	ma, okA, err := statmetaok(rootA, rel)
	if err != nil {
		return false, err
	}
	mb, okB, err := statmetaok(rootB, rel)
	if err != nil {
		return false, err
	}
	if !okA || !okB {
		return false, nil
	}
	if ma.Size != mb.Size {
		return false, nil
	}
	ha, err := filesha256(filepath.Join(rootA, filepath.FromSlash(rel)))
	if err != nil {
		return false, err
	}
	hb, err := filesha256(filepath.Join(rootB, filepath.FromSlash(rel)))
	if err != nil {
		return false, err
	}
	return ha == hb, nil
}

func buildunifiedfromsides(r, z Snapshot) Snapshot {
	unified := Snapshot{}
	for rel, m := range z {
		unified[rel] = m
	}
	for rel, m := range r {
		unified[rel] = m
	}
	return unified
}

// applyops runs journaled sync ops. When scoped is false, r and z side
// snapshots are updated and merged (remote meta wins). When scoped is true,
// unified is updated in place. On error the current partial snapshot is
// returned, never the input baseline.
func applyops(
	remote, zedcafe string,
	ops []syncop,
	r, z Snapshot,
	unified Snapshot,
	scoped bool,
) (Snapshot, []string, error) {
	partialsnap := func() Snapshot {
		if scoped {
			return unified
		}
		return buildunifiedfromsides(r, z)
	}
	setcopytozmeta := func(rel string, meta FileMeta) {
		if scoped {
			unified[rel] = meta
			return
		}
		z[rel] = meta
		r[rel] = meta
	}

	var state SyncState
	statedirty := false
	if len(ops) > 0 {
		var serr error
		state, serr = ReadSyncState(remote)
		if serr != nil {
			return partialsnap(), nil, fmt.Errorf("read sync state: %w", serr)
		}
	}
	madedirs := map[string]struct{}{}
	var prunedirs []string
	var logs []string
	for _, op := range ops {
		switch op.kind {
		case "copytoz":
			equal, eerr := filescontentequal(remote, zedcafe, op.rel)
			if eerr != nil {
				return partialsnap(), logs, fmt.Errorf("copytoz compare %s: %w", op.rel, eerr)
			}
			if equal {
				meta, serr := statmeta(remote, op.rel)
				if serr != nil {
					return partialsnap(), logs, fmt.Errorf("copytoz stat %s: %w", op.rel, serr)
				}
				setcopytozmeta(op.rel, meta)
				logs = append(logs, fmt.Sprintf("skip copytoz (unchanged) %s", op.rel))
				continue
			}
			rev, jerr := journalcopy(remote, remote, zedcafe, "copytoz", op.rel, madedirs)
			if jerr != nil {
				return partialsnap(), logs, fmt.Errorf("copytoz %s: %w", op.rel, jerr)
			}
			state.LastZedcafeRev = rev
			statedirty = true
			meta, serr := statmeta(remote, op.rel)
			if serr != nil {
				return partialsnap(), logs, fmt.Errorf("copytoz stat %s: %w", op.rel, serr)
			}
			setcopytozmeta(op.rel, meta)
		case "copytor":
			equal, eerr := filescontentequal(zedcafe, remote, op.rel)
			if eerr != nil {
				return partialsnap(), logs, fmt.Errorf("copytor compare %s: %w", op.rel, eerr)
			}
			if equal {
				meta, serr := statmeta(remote, op.rel)
				if serr != nil {
					return partialsnap(), logs, fmt.Errorf("copytor stat %s: %w", op.rel, serr)
				}
				if scoped {
					unified[op.rel] = meta
				} else {
					r[op.rel] = meta
				}
				logs = append(logs, fmt.Sprintf("skip copytor (unchanged) %s", op.rel))
				continue
			}
			rev, jerr := journalcopy(remote, zedcafe, remote, "copytor", op.rel, madedirs)
			if jerr != nil {
				return partialsnap(), logs, fmt.Errorf("copytor %s: %w", op.rel, jerr)
			}
			state.LastRemoteRev = rev
			statedirty = true
			meta, serr := statmeta(remote, op.rel)
			if serr != nil {
				return partialsnap(), logs, fmt.Errorf("copytor stat %s: %w", op.rel, serr)
			}
			if scoped {
				unified[op.rel] = meta
			} else {
				r[op.rel] = meta
			}
		case "deleteremote":
			if err := removefiledeferred(remote, op.rel, &prunedirs); err != nil {
				return partialsnap(), logs, fmt.Errorf("deleteremote %s: %w", op.rel, err)
			}
			if scoped {
				delete(unified, op.rel)
			} else {
				delete(r, op.rel)
			}
		}
		logs = append(logs, op.logmsg)
	}
	pruneemptydirs(prunedirs)
	if statedirty {
		if werr := WriteSyncState(remote, state); werr != nil {
			return partialsnap(), logs, fmt.Errorf("write sync state: %w", werr)
		}
	}
	return partialsnap(), logs, nil
}

// applyscopedops executes ops (journaled + SyncState-tracked, same
// durability pattern as steadytickbody's apply loop) against unified, for
// callers that only stat individual rel paths rather than walking both
// trees. unified is mutated in place and also returned.
func applyscopedops(remote, zedcafe string, ops []syncop, unified Snapshot) (Snapshot, []string, error) {
	return applyops(remote, zedcafe, ops, nil, nil, unified, true)
}

// ReadRevision reads the host-written zedcafe/.zedsync/revision hint (see
// RevisionFile / WANIX_ZEDSYNC_REVISION_FILE in wanixzedcafeconstants.ts,
// written by zedcafehost.ts pushzedcafeexportlive). A missing file is
// revision 0 with no paths, not an error.
func ReadRevision(zedcafe string) (rev int64, paths []string, err error) {
	path := filepath.Join(zedcafe, filepath.FromSlash(RevisionFile))
	data, rerr := os.ReadFile(path)
	if rerr != nil {
		if os.IsNotExist(rerr) {
			return 0, nil, nil
		}
		return 0, nil, fmt.Errorf("read revision %s: %w", path, rerr)
	}
	var payload struct {
		Revision int64    `json:"revision"`
		Paths    []string `json:"paths"`
	}
	if uerr := json.Unmarshal(data, &payload); uerr != nil {
		return 0, nil, fmt.Errorf("parse revision %s: %w", path, uerr)
	}
	return payload.Revision, payload.Paths, nil
}

// steadytickpaths applies planop only for the given rel paths (from
// ReadRevision), stat'ing each side directly instead of a full WalkFiles of
// both trees.
func steadytickpaths(remote, zedcafe string, baseline Snapshot, paths []string) (Snapshot, []string, error) {
	unified := Snapshot{}
	for rel, m := range baseline {
		unified[rel] = m
	}
	ops := make([]syncop, 0, len(paths))
	for _, rel := range paths {
		bm, binbase := baseline[rel]
		rm, rinremote, rerr := statmetaok(remote, rel)
		if rerr != nil {
			return baseline, nil, fmt.Errorf("stat remote %s: %w", rel, rerr)
		}
		zm, rinzed, zerr := statmetaok(zedcafe, rel)
		if zerr != nil {
			return baseline, nil, fmt.Errorf("stat zedcafe %s: %w", rel, zerr)
		}
		if op, needed := planop(rel, bm, binbase, rm, rinremote, zm, rinzed); needed {
			ops = append(ops, op)
		} else if !rinremote && !rinzed {
			delete(unified, rel)
		}
	}
	sortops(ops)
	return applyscopedops(remote, zedcafe, ops, unified)
}

// steadytickincrementalpeeronly resyncs peer (remote)-only edits with a
// single remote-side walk, skipping zedcafe entirely -- used when the
// revision file has not bumped (zedcafe presumed unchanged since baseline).
func steadytickincrementalpeeronly(
	remote, zedcafe string, baseline Snapshot,
) (Snapshot, []string, error) {
	r, err := WalkFiles(remote)
	if err != nil {
		return baseline, nil, fmt.Errorf("walk remote: %w", err)
	}
	LastWalkCount = 1
	all := map[string]struct{}{}
	for rel := range baseline {
		all[rel] = struct{}{}
	}
	for rel := range r {
		all[rel] = struct{}{}
	}
	ops := make([]syncop, 0, len(all))
	for rel := range all {
		bm, binbase := baseline[rel]
		rm, rinremote := r[rel]
		// zedcafe assumed unchanged (revision unchanged) -- substitute
		// baseline for the zedcafe side so only remote-originated changes
		// surface as ops.
		if op, needed := planop(rel, bm, binbase, rm, rinremote, bm, binbase); needed {
			ops = append(ops, op)
		}
	}
	sortops(ops)
	unified := Snapshot{}
	for rel, m := range baseline {
		unified[rel] = m
	}
	return applyscopedops(remote, zedcafe, ops, unified)
}

// SteadyTickIncremental applies only zedcafe's revision-file dirty paths
// (ReadRevision) when possible, skipping the full bidirectional WalkFiles
// that SteadyTick performs. When revision bumps, scoped host paths run
// first, then a peer-only pass so peer edits outside the revision list are
// not starved under host export churn. Returns ErrZedsyncNeedFullTick when
// the revision file cannot be read/parsed, or bumped with an empty path
// list (incomplete incremental state) -- the caller (cmd/main.go) falls
// back to SteadyTick, the documented primary recovery path, not a silent
// retry.
func SteadyTickIncremental(
	remote, zedcafe string, baseline Snapshot, lastrev int64,
) (snap Snapshot, logs []string, newrev int64, err error) {
	LastWalkCount = 0
	rev, paths, rerr := ReadRevision(zedcafe)
	if rerr != nil {
		return nil, nil, lastrev, fmt.Errorf("%w: %v", ErrZedsyncNeedFullTick, rerr)
	}
	if rev == lastrev {
		snap, logs, err = steadytickincrementalpeeronly(remote, zedcafe, baseline)
		return snap, logs, rev, err
	}
	if len(paths) == 0 {
		return nil, nil, rev, ErrZedsyncNeedFullTick
	}
	snap, logs, err = steadytickpaths(remote, zedcafe, baseline, paths)
	if err != nil {
		return snap, logs, rev, err
	}
	// Peer-only pass after host-scoped tick so peer edits outside revision
	// paths still reach zedcafe while host export churn keeps bumping rev.
	peersnap, peerlogs, peererr := steadytickincrementalpeeronly(remote, zedcafe, snap)
	if peererr != nil {
		return snap, logs, rev, peererr
	}
	logs = append(logs, peerlogs...)
	return peersnap, logs, rev, nil
}

// WriteReadySentinel marks seed complete on the remote mount.
func WriteReadySentinel(remote string) error {
	path := filepath.Join(remote, filepath.FromSlash(ReadySentinel))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte("ok\n"), 0o644)
}

// WaitDirExists polls until path is a directory or timeout.
func WaitDirExists(path string, timeout, poll time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		info, err := os.Stat(path)
		if err == nil && info.IsDir() {
			return nil
		}
		if !time.Now().Before(deadline) {
			if err != nil {
				return fmt.Errorf("wait dir %s: %w", path, err)
			}
			return fmt.Errorf("wait dir %s: not a directory", path)
		}
		time.Sleep(poll)
	}
}
