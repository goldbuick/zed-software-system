package findplayers

import (
	"encoding/json"
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

type exportStats struct {
	ExportedAt string `json:"exportedAt"`
	BookCount  *int   `json:"bookCount"`
}

func statsContentReady(data []byte) bool {
	if len(data) == 0 {
		return false
	}
	var stats exportStats
	if err := json.Unmarshal(data, &stats); err != nil {
		return false
	}
	if stats.ExportedAt == "" || stats.BookCount == nil {
		return false
	}
	return true
}

func readStatsContent(fsys fs.FS, root string) ([]byte, error) {
	path := path.Join(root, "stats.json")
	info, err := fs.Stat(fsys, path)
	if err != nil {
		return nil, err
	}
	if info.Size() == 0 {
		return nil, fs.ErrNotExist
	}
	return fs.ReadFile(fsys, path)
}

// ExportRootReady reports whether stats.json has host export content.
func ExportRootReady(fsys fs.FS, root string) bool {
	data, err := readStatsContent(fsys, root)
	if err != nil {
		return false
	}
	return statsContentReady(data)
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
