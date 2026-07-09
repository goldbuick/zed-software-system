package findplayers

import (
	"io/fs"
	"strings"
)

// OpenExportFS returns the export tree within parent at exportroot.
// Use the same parent FS that ResolveExportRoot / WaitExportRoot probe —
// gojs bind mounts are visible from "." but not always via os.DirFS(exportroot).
func OpenExportFS(parent fs.FS, exportroot string) (fs.FS, error) {
	if exportroot == "" || exportroot == "." {
		return parent, nil
	}
	exportroot = strings.TrimPrefix(exportroot, "./")
	return fs.Sub(parent, exportroot)
}
