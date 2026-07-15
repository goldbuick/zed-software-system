package zedsync

import (
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	ZedcafeMount   = "zedcafe"
	ReadySentinel  = ".zedsync-ready"
	PollInterval   = 500 * time.Millisecond
	SkipSentinel   = ReadySentinel
)

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
	src := filepath.Join(srcroot, filepath.FromSlash(rel))
	dst := filepath.Join(dstroot, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
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

func removefile(root, rel string) error {
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
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
		for rel := range z {
			if err := copyfile(zedcafe, remote, rel); err != nil {
				return copied, fmt.Errorf("seed remote %s: %w", rel, err)
			}
			copied++
		}
	case len(z) == 0 && len(r) > 0:
		for rel := range r {
			if err := copyfile(remote, zedcafe, rel); err != nil {
				return copied, fmt.Errorf("seed zedcafe %s: %w", rel, err)
			}
			copied++
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
		for rel := range all {
			rm, rok := r[rel]
			zm, zok := z[rel]
			switch {
			case rok && !zok:
				if err := copyfile(remote, zedcafe, rel); err != nil {
					return copied, err
				}
				copied++
			case zok && !rok:
				if err := copyfile(zedcafe, remote, rel); err != nil {
					return copied, err
				}
				copied++
			case rok && zok:
				if rm.Mtime.After(zm.Mtime) || (rm.Mtime.Equal(zm.Mtime) && rm.Size != zm.Size) {
					if err := copyfile(remote, zedcafe, rel); err != nil {
						return copied, err
					}
					copied++
				} else if zm.Mtime.After(rm.Mtime) {
					if err := copyfile(zedcafe, remote, rel); err != nil {
						return copied, err
					}
					copied++
				}
			}
		}
	}
	return copied, nil
}

// SteadyTick applies creates/updates both ways vs baseline.
// Deletes on remote are ignored: the file is restored from zedcafe.
// Deletes on zedcafe still remove the peer on remote.
// Returns the next baseline snapshot (unified view after apply).
func SteadyTick(remote, zedcafe string, baseline Snapshot) (Snapshot, []string, error) {
	r, err := WalkFiles(remote)
	if err != nil {
		return baseline, nil, err
	}
	z, err := WalkFiles(zedcafe)
	if err != nil {
		return baseline, nil, err
	}
	var logs []string

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

	for rel := range all {
		bm, binbase := baseline[rel]
		rm, rinremote := r[rel]
		zm, rinzed := z[rel]

		switch {
		case !binbase && rinremote && !rinzed:
			if err := copyfile(remote, zedcafe, rel); err != nil {
				return baseline, logs, err
			}
			logs = append(logs, fmt.Sprintf("create zedcafe ← %s", rel))
		case !binbase && rinzed && !rinremote:
			if err := copyfile(zedcafe, remote, rel); err != nil {
				return baseline, logs, err
			}
			logs = append(logs, fmt.Sprintf("create remote ← %s", rel))
		case !binbase && rinremote && rinzed:
			if rm.Mtime.After(zm.Mtime) || rm.Mtime.Equal(zm.Mtime) {
				if err := copyfile(remote, zedcafe, rel); err != nil {
					return baseline, logs, err
				}
				logs = append(logs, fmt.Sprintf("create/conflict zedcafe ← %s", rel))
			} else {
				if err := copyfile(zedcafe, remote, rel); err != nil {
					return baseline, logs, err
				}
				logs = append(logs, fmt.Sprintf("create/conflict remote ← %s", rel))
			}
		case binbase && !rinremote && !rinzed:
			// already gone both sides
		case binbase && !rinremote && rinzed:
			// deleted on remote → restore from zedcafe (remote deletes do not wipe zedcafe)
			if err := copyfile(zedcafe, remote, rel); err != nil {
				return baseline, logs, err
			}
			logs = append(logs, fmt.Sprintf("restore remote ← zedcafe %s", rel))
		case binbase && rinremote && !rinzed:
			// deleted on zedcafe → delete remote
			if err := removefile(remote, rel); err != nil {
				return baseline, logs, err
			}
			logs = append(logs, fmt.Sprintf("delete remote ← gone on zedcafe %s", rel))
		case binbase && rinremote && rinzed:
			remotechanged := newer(rm, bm) || rm.Size != bm.Size || !rm.Mtime.Equal(bm.Mtime)
			zedchanged := newer(zm, bm) || zm.Size != bm.Size || !zm.Mtime.Equal(bm.Mtime)
			if remotechanged && zedchanged {
				if rm.Mtime.After(zm.Mtime) || rm.Mtime.Equal(zm.Mtime) {
					if err := copyfile(remote, zedcafe, rel); err != nil {
						return baseline, logs, err
					}
					logs = append(logs, fmt.Sprintf("conflict zedcafe ← %s", rel))
				} else {
					if err := copyfile(zedcafe, remote, rel); err != nil {
						return baseline, logs, err
					}
					logs = append(logs, fmt.Sprintf("conflict remote ← %s", rel))
				}
			} else if remotechanged {
				if err := copyfile(remote, zedcafe, rel); err != nil {
					return baseline, logs, err
				}
				logs = append(logs, fmt.Sprintf("update zedcafe ← %s", rel))
			} else if zedchanged {
				if err := copyfile(zedcafe, remote, rel); err != nil {
					return baseline, logs, err
				}
				logs = append(logs, fmt.Sprintf("update remote ← %s", rel))
			}
		}
	}

	next, err := WalkFiles(remote)
	if err != nil {
		return baseline, logs, err
	}
	z2, err := WalkFiles(zedcafe)
	if err != nil {
		return baseline, logs, err
	}
	// Prefer remote meta when both present after tick.
	unified := Snapshot{}
	for rel, m := range z2 {
		unified[rel] = m
	}
	for rel, m := range next {
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
