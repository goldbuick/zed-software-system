package findplayers

import (
	"io/fs"
	"path"
	"time"
)

// DefaultExportRoots are guest paths probed for zedcafe export readiness.
var DefaultExportRoots = []string{
	"zedcafe",
	"./zedcafe",
	"#ramfs/zedcafe",
}

const (
	// ExportReadyTimeout matches WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS.
	ExportReadyTimeout = 30 * time.Second
	// ExportReadyPoll matches WANIX_ZEDCAFE_EXPORT_READY_POLL_MS.
	ExportReadyPoll = 250 * time.Millisecond
)

// ExportRootReady reports whether stats.json exists under root.
func ExportRootReady(fsys fs.FS, root string) bool {
	_, err := fs.Stat(fsys, path.Join(root, "stats.json"))
	return err == nil
}

// ResolveExportRoot returns the first root containing stats.json.
func ResolveExportRoot(fsys fs.FS, roots []string) (string, error) {
	for _, root := range roots {
		if ExportRootReady(fsys, root) {
			return root, nil
		}
	}
	return "", ErrExportNotReady
}

// WaitExportRoot polls until stats.json appears or timeout elapses.
func WaitExportRoot(
	fsys fs.FS,
	roots []string,
	timeout time.Duration,
	poll time.Duration,
) (string, error) {
	deadline := time.Now().Add(timeout)
	for {
		root, err := ResolveExportRoot(fsys, roots)
		if err == nil {
			return root, nil
		}
		if !time.Now().Before(deadline) {
			return "", ErrExportNotReady
		}
		time.Sleep(poll)
	}
}
