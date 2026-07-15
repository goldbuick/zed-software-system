package zedsync

import (
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
	ZedcafeMount      = "zedcafe"
	ReadySentinel     = ".zedsync-ready"
	PollInterval      = 500 * time.Millisecond
	PollIdleMax       = 4 * time.Second
	SkipSentinel      = ReadySentinel
	SeedProgressEvery = 100
)

// LastWalkCount is the number of WalkFiles calls in the most recent SteadyTick.
var LastWalkCount int

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
// (any path segment starts with '.' — dotfiles, hidden dirs, ready sentinel).
func shouldskip(rel string) bool {
	for _, seg := range strings.Split(rel, "/") {
		if strings.HasPrefix(seg, ".") {
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

func copyfile(srcroot, dstroot, rel string) error {
	return copyfilecached(srcroot, dstroot, rel, nil)
}

func copyfilecached(srcroot, dstroot, rel string, madedirs map[string]struct{}) error {
	src := filepath.Join(srcroot, filepath.FromSlash(rel))
	dst := filepath.Join(dstroot, filepath.FromSlash(rel))
	parent := filepath.Dir(dst)
	if madedirs == nil {
		if err := os.MkdirAll(parent, 0o755); err != nil {
			return err
		}
	} else if _, ok := madedirs[parent]; !ok {
		if err := os.MkdirAll(parent, 0o755); err != nil {
			return err
		}
		madedirs[parent] = struct{}{}
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	info, err := os.Stat(src)
	if err == nil {
		_ = os.Chtimes(dst, info.ModTime(), info.ModTime())
	}
	return nil
}

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
		return err
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
	// deepest-first
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

// InitialSeed copies between remote and zedcafe without deletes.
// Empty remote + non-empty zedcafe seeds remote from zedcafe.
func InitialSeed(remote, zedcafe string, r, z Snapshot) (copied int, err error) {
	switch {
	case len(r) == 0 && len(z) > 0:
		total := len(z)
		for rel := range z {
			if err := copyfile(zedcafe, remote, rel); err != nil {
				return copied, fmt.Errorf("seed remote %s: %w", rel, err)
			}
			copied++
			reportseedprogress(copied, total)
		}
	case len(z) == 0 && len(r) > 0:
		total := len(r)
		for rel := range r {
			if err := copyfile(remote, zedcafe, rel); err != nil {
				return copied, fmt.Errorf("seed zedcafe %s: %w", rel, err)
			}
			copied++
			reportseedprogress(copied, total)
		}
	case len(r) == 0 && len(z) == 0:
		return 0, nil
	default:
		// Union seed: unique paths both ways; shared → LWW (tie → remote wins).
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
				if err := copyfile(remote, zedcafe, rel); err != nil {
					return copied, err
				}
				copied++
				reportseedprogress(copied, total)
			case zok && !rok:
				if err := copyfile(zedcafe, remote, rel); err != nil {
					return copied, err
				}
				copied++
				reportseedprogress(copied, total)
			case rok && zok:
				if rm.Mtime.After(zm.Mtime) || (rm.Mtime.Equal(zm.Mtime) && rm.Size != zm.Size) {
					if err := copyfile(remote, zedcafe, rel); err != nil {
						return copied, err
					}
					copied++
					reportseedprogress(copied, total)
				} else if zm.Mtime.After(rm.Mtime) {
					if err := copyfile(zedcafe, remote, rel); err != nil {
						return copied, err
					}
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

// SteadyTick applies creates/updates both ways vs baseline.
// Deletes on remote are ignored: the file is restored from zedcafe.
// Deletes on zedcafe still remove the peer on remote.
// Performs two WalkFiles (remote + zedcafe); next baseline is built from
// in-memory side snapshots updated after successful mutations.
func SteadyTick(remote, zedcafe string, baseline Snapshot) (Snapshot, []string, error) {
	LastWalkCount = 0
	r, err := WalkFiles(remote)
	if err != nil {
		return baseline, nil, err
	}
	LastWalkCount++
	z, err := WalkFiles(zedcafe)
	if err != nil {
		return baseline, nil, err
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

		switch {
		case !binbase && rinremote && !rinzed:
			ops = append(ops, syncop{rel, "copytoz", fmt.Sprintf("create zedcafe ← %s", rel)})
		case !binbase && rinzed && !rinremote:
			ops = append(ops, syncop{rel, "copytor", fmt.Sprintf("create remote ← %s", rel)})
		case !binbase && rinremote && rinzed:
			if rm.Mtime.After(zm.Mtime) || rm.Mtime.Equal(zm.Mtime) {
				ops = append(ops, syncop{rel, "copytoz", fmt.Sprintf("create/conflict zedcafe ← %s", rel)})
			} else {
				ops = append(ops, syncop{rel, "copytor", fmt.Sprintf("create/conflict remote ← %s", rel)})
			}
		case binbase && !rinremote && !rinzed:
			// already gone both sides
		case binbase && !rinremote && rinzed:
			ops = append(ops, syncop{rel, "copytor", fmt.Sprintf("restore remote ← zedcafe %s", rel)})
		case binbase && rinremote && !rinzed:
			ops = append(ops, syncop{rel, "deleteremote", fmt.Sprintf("delete remote ← gone on zedcafe %s", rel)})
		case binbase && rinremote && rinzed:
			remotechanged := newer(rm, bm) || rm.Size != bm.Size || !rm.Mtime.Equal(bm.Mtime)
			zedchanged := newer(zm, bm) || zm.Size != bm.Size || !zm.Mtime.Equal(bm.Mtime)
			if remotechanged && zedchanged {
				if rm.Mtime.After(zm.Mtime) || rm.Mtime.Equal(zm.Mtime) {
					ops = append(ops, syncop{rel, "copytoz", fmt.Sprintf("conflict zedcafe ← %s", rel)})
				} else {
					ops = append(ops, syncop{rel, "copytor", fmt.Sprintf("conflict remote ← %s", rel)})
				}
			} else if remotechanged {
				ops = append(ops, syncop{rel, "copytoz", fmt.Sprintf("update zedcafe ← %s", rel)})
			} else if zedchanged {
				ops = append(ops, syncop{rel, "copytor", fmt.Sprintf("update remote ← %s", rel)})
			}
		}
	}

	// Deterministic plan: ordinary files before stats.json; sorted otherwise.
	sort.SliceStable(ops, func(i, j int) bool {
		istat := strings.HasSuffix(ops[i].rel, "/stats.json") || ops[i].rel == "stats.json"
		jstat := strings.HasSuffix(ops[j].rel, "/stats.json") || ops[j].rel == "stats.json"
		if istat != jstat {
			return !istat
		}
		return ops[i].rel < ops[j].rel
	})

	madedirs := map[string]struct{}{}
	var prunedirs []string
	var logs []string
	for _, op := range ops {
		switch op.kind {
		case "copytoz":
			if err := copyfilecached(remote, zedcafe, op.rel, madedirs); err != nil {
				return baseline, logs, err
			}
			meta, serr := statmeta(zedcafe, op.rel)
			if serr != nil {
				return baseline, logs, serr
			}
			z[op.rel] = meta
		case "copytor":
			if err := copyfilecached(zedcafe, remote, op.rel, madedirs); err != nil {
				return baseline, logs, err
			}
			meta, serr := statmeta(remote, op.rel)
			if serr != nil {
				return baseline, logs, serr
			}
			r[op.rel] = meta
		case "deleteremote":
			if err := removefiledeferred(remote, op.rel, &prunedirs); err != nil {
				return baseline, logs, err
			}
			delete(r, op.rel)
		}
		logs = append(logs, op.logmsg)
	}
	pruneemptydirs(prunedirs)

	// Prefer remote meta when both present after tick.
	unified := Snapshot{}
	for rel, m := range z {
		unified[rel] = m
	}
	for rel, m := range r {
		unified[rel] = m
	}
	return unified, logs, nil
}

// WriteReadySentinel marks seed complete on the remote mount.
func WriteReadySentinel(remote string) error {
	path := filepath.Join(remote, ReadySentinel)
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
