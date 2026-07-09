package findplayers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"
)

var ErrExportNotReady = errors.New("zedcafe export not ready")

// Player is one discovered pid_* identity in the export tree.
type Player struct {
	ID      string         `json:"id"`
	Active  bool           `json:"active"`
	Onboard bool           `json:"onboard"`
	Book    string         `json:"book,omitempty"`
	Page    string         `json:"page,omitempty"`
	Board   string         `json:"board,omitempty"`
	X       *int           `json:"x,omitempty"`
	Y       *int           `json:"y,omitempty"`
	Kind    string         `json:"kind,omitempty"`
	Flags   map[string]any `json:"flags,omitempty"`
}

// Report is the JSON stdout payload.
type Report struct {
	ExportRoot  string   `json:"exportRoot"`
	PlayerCount int      `json:"playerCount"`
	Players     []Player `json:"players"`
}

type bookStats struct {
	ActiveList []string                  `json:"activelist"`
	Flags      map[string]json.RawMessage `json:"flags"`
}

type boardObject struct {
	Kind string  `json:"kind"`
	ID   string  `json:"id"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
}

func ispid(id string) bool {
	return strings.HasPrefix(id, "pid_")
}

func intfromcoord(v float64) *int {
	n := int(v)
	return &n
}

func ensureplayer(players map[string]*Player, id string) *Player {
	if p, ok := players[id]; ok {
		return p
	}
	p := &Player{ID: id}
	players[id] = p
	return p
}

func readfile(fsys fs.FS, name string) ([]byte, error) {
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func scanbookstats(
	fsys fs.FS,
	rel string,
	players map[string]*Player,
) error {
	data, err := readfile(fsys, rel)
	if err != nil {
		return err
	}
	var stats bookStats
	if err := json.Unmarshal(data, &stats); err != nil {
		return fmt.Errorf("parse %s: %w", rel, err)
	}
	bookdir := strings.Split(rel, "/")[1]
	for _, id := range stats.ActiveList {
		if !ispid(id) {
			continue
		}
		p := ensureplayer(players, id)
		p.Active = true
		p.Book = bookdir
		if raw, ok := stats.Flags[id]; ok {
			var flags map[string]any
			if err := json.Unmarshal(raw, &flags); err == nil {
				p.Flags = flags
				if board, ok := flags["board"].(string); ok && board != "" {
					p.Board = board
				}
			}
		}
	}
	for id, raw := range stats.Flags {
		if !ispid(id) {
			continue
		}
		p := ensureplayer(players, id)
		if p.Book == "" {
			p.Book = bookdir
		}
		var flags map[string]any
		if err := json.Unmarshal(raw, &flags); err == nil {
			if p.Flags == nil {
				p.Flags = flags
			}
			if p.Board == "" {
				if board, ok := flags["board"].(string); ok {
					p.Board = board
				}
			}
		}
	}
	return nil
}

func scanboardobject(
	rel string,
	data []byte,
	players map[string]*Player,
) error {
	parts := strings.Split(rel, "/")
	if len(parts) < 6 {
		return nil
	}
	bookdir := parts[1]
	pagedir := parts[3]
	filename := parts[len(parts)-1]
	objid := strings.TrimSuffix(filename, ".json")

	var obj boardObject
	if err := json.Unmarshal(data, &obj); err != nil {
		return fmt.Errorf("parse %s: %w", rel, err)
	}
	id := objid
	if obj.ID != "" {
		id = obj.ID
	}
	if !ispid(id) {
		if obj.Kind == "player" && ispid(objid) {
			id = objid
		} else {
			return nil
		}
	}
	p := ensureplayer(players, id)
	p.Onboard = true
	p.Book = bookdir
	p.Page = pagedir
	if p.Board == "" {
		p.Board = pagedir
	}
	if obj.Kind != "" {
		p.Kind = obj.Kind
	}
	p.X = intfromcoord(obj.X)
	p.Y = intfromcoord(obj.Y)
	return nil
}

// Scan walks a zedcafe export tree and merges roster + board avatars.
func Scan(fsys fs.FS, exportroot string) (Report, error) {
	if exportroot == "" {
		exportroot = "zedcafe"
	}
	if _, err := fs.Stat(fsys, "stats.json"); err != nil {
		return Report{}, fmt.Errorf("%w: missing stats.json", ErrExportNotReady)
	}

	players := make(map[string]*Player)
	var walkerr error
	err := fs.WalkDir(fsys, ".", func(rel string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel = path.Clean(rel)
		if rel == "stats.json" {
			return nil
		}
		switch {
		case strings.HasSuffix(rel, "/stats.json") && strings.Count(rel, "/") == 2 && strings.HasPrefix(rel, "books/"):
			if err := scanbookstats(fsys, rel, players); err != nil {
				walkerr = err
			}
		case strings.Contains(rel, "/board/objects/") && strings.HasSuffix(rel, ".json"):
			data, err := readfile(fsys, rel)
			if err != nil {
				walkerr = err
				return nil
			}
			if err := scanboardobject(rel, data, players); err != nil {
				walkerr = err
			}
		}
		return nil
	})
	if err != nil {
		return Report{}, err
	}
	if walkerr != nil {
		return Report{}, walkerr
	}

	ids := make([]string, 0, len(players))
	for id := range players {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	out := make([]Player, 0, len(ids))
	for _, id := range ids {
		out = append(out, *players[id])
	}
	return Report{
		ExportRoot:  exportroot,
		PlayerCount: len(out),
		Players:     out,
	}, nil
}
