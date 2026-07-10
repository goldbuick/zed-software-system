package greenring

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
)

// ApplyRingToBoard reads board/terrain.json under book/page, paints a green
// ring around (x, y), and writes the file back.
func ApplyRingToBoard(exportroot string, bookdir, pagedir string, x, y int) error {
	rel := path.Join(bookdir, pagedir, "board", "terrain.json")
	full := filepath.Join(exportroot, filepath.FromSlash(rel))
	data, err := os.ReadFile(full)
	if err != nil {
		if os.IsNotExist(err) {
			data = []byte("[]")
		} else {
			return fmt.Errorf("read %s: %w", full, err)
		}
	}
	var terrain []any
	if err := json.Unmarshal(data, &terrain); err != nil {
		return fmt.Errorf("parse %s: %w", full, err)
	}
	terrain = PaintGreenRing(terrain, x, y)
	out, err := json.Marshal(terrain)
	if err != nil {
		return err
	}
	out = append(out, '\n')
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(full, out, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", full, err)
	}
	return nil
}

// ApplyRingsForPlayers paints a green ring around each onboard player with coords.
func ApplyRingsForPlayers(exportroot string, players []PlayerXY) (int, error) {
	painted := 0
	for _, p := range players {
		if err := ApplyRingToBoard(exportroot, p.Book, p.Page, p.X, p.Y); err != nil {
			return painted, err
		}
		painted++
	}
	return painted, nil
}

// PlayerXY is the minimal player location needed to paint a ring.
type PlayerXY struct {
	Book string
	Page string
	X    int
	Y    int
}

// ReadTerrainJSON is a test helper for parsing terrain bytes.
func ReadTerrainJSON(fsys fs.FS, name string) ([]any, error) {
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		return nil, err
	}
	var terrain []any
	if err := json.Unmarshal(data, &terrain); err != nil {
		return nil, err
	}
	return terrain, nil
}
