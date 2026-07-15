package greenring

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
)

// PlayerXY is the minimal player location needed to paint a ring.
type PlayerXY struct {
	Book     string
	Page     string // export dir hint (may be bare board id)
	PlayerID string
	X        int
	Y        int
}

func terraincellpath(exportroot, bookdir, pagedir string, index int) string {
	return filepath.Join(
		exportroot,
		filepath.FromSlash(bookdir),
		filepath.FromSlash(pagedir),
		"board",
		"terrain",
		strconv.Itoa(index)+".json",
	)
}

func hasterrain(exportroot, bookdir, pagedir string) bool {
	_, err := os.Stat(terraincellpath(exportroot, bookdir, pagedir, 0))
	return err == nil
}

// ResolveBoardPageDir finds the export page directory under bookdir that holds
// board/terrain/*.json. boardhint may be a full dir name or a bare page/board id.
func ResolveBoardPageDir(exportroot, bookdir, boardhint, playerid string) (string, error) {
	bookpath := filepath.Join(exportroot, filepath.FromSlash(bookdir))

	if playerid != "" {
		suffix := filepath.ToSlash(filepath.Join("board", "objects", playerid+".json"))
		var found string
		_ = filepath.WalkDir(bookpath, func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return err
			}
			rel, rerr := filepath.Rel(bookpath, p)
			if rerr != nil {
				return nil
			}
			rel = filepath.ToSlash(rel)
			if !strings.HasSuffix(rel, suffix) {
				return nil
			}
			parts := strings.Split(rel, "/")
			if len(parts) >= 1 {
				found = parts[0]
				return fs.SkipAll
			}
			return nil
		})
		if found != "" && hasterrain(exportroot, bookdir, found) {
			return found, nil
		}
	}

	if boardhint != "" && hasterrain(exportroot, bookdir, boardhint) {
		return boardhint, nil
	}

	entries, err := os.ReadDir(bookpath)
	if err != nil {
		return "", fmt.Errorf("list %s: %w", bookpath, err)
	}
	for _, ent := range entries {
		if !ent.IsDir() {
			continue
		}
		name := ent.Name()
		if boardhint != "" &&
			(name == boardhint || strings.HasSuffix(name, "-"+boardhint)) &&
			hasterrain(exportroot, bookdir, name) {
			return name, nil
		}
	}
	for _, ent := range entries {
		if !ent.IsDir() || strings.HasPrefix(ent.Name(), "player-") {
			continue
		}
		if hasterrain(exportroot, bookdir, ent.Name()) {
			return ent.Name(), nil
		}
	}
	return "", fmt.Errorf(
		"no board/terrain/ under %s (hint=%q player=%q)",
		bookdir,
		boardhint,
		playerid,
	)
}

func readcell(full string) (any, error) {
	data, err := os.ReadFile(full)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var cell any
	if err := json.Unmarshal(data, &cell); err != nil {
		return nil, err
	}
	return cell, nil
}

func writecell(full string, cell any) error {
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	out, err := json.Marshal(cell)
	if err != nil {
		return err
	}
	out = append(out, '\n')
	return os.WriteFile(full, out, 0o644)
}

// ApplyRingToBoard paints char/fg/bg on ring cells as board/terrain/<index>.json.
func ApplyRingToBoard(exportroot string, bookdir, pagedir string, x, y int) error {
	for _, cellxy := range RingCells(x, y) {
		idx := TerrainIndex(cellxy[0], cellxy[1])
		if idx < 0 {
			continue
		}
		full := terraincellpath(exportroot, bookdir, pagedir, idx)
		cell, err := readcell(full)
		if err != nil {
			return fmt.Errorf("read %s: %w", full, err)
		}
		painted := PaintCellDisplay(cell, RingChar, ColorGreen, ColorBlack)
		if err := writecell(full, painted); err != nil {
			return fmt.Errorf("write %s: %w", full, err)
		}
	}
	return nil
}

// ApplyRingsForPlayers resolves each player's board page dir, then paints rings.
// Returns painted count and a human-readable log of write targets.
func ApplyRingsForPlayers(exportroot string, players []PlayerXY) (int, []string, error) {
	painted := 0
	logs := make([]string, 0, len(players))
	for _, p := range players {
		pagedir, err := ResolveBoardPageDir(exportroot, p.Book, p.Page, p.PlayerID)
		if err != nil {
			return painted, logs, err
		}
		rel := path.Join(p.Book, pagedir, "board", "terrain")
		logs = append(logs, fmt.Sprintf(
			"write book=%s page=%s (hint=%s) player=%s x=%d y=%d path=%s/",
			p.Book,
			pagedir,
			p.Page,
			p.PlayerID,
			p.X,
			p.Y,
			rel,
		))
		if err := ApplyRingToBoard(exportroot, p.Book, pagedir, p.X, p.Y); err != nil {
			return painted, logs, err
		}
		painted++
	}
	return painted, logs, nil
}

// ReadTerrainJSON is a test helper for parsing a terrain cell file.
func ReadTerrainJSON(fsys fs.FS, name string) (any, error) {
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		return nil, err
	}
	var cell any
	if err := json.Unmarshal(data, &cell); err != nil {
		return nil, err
	}
	return cell, nil
}
