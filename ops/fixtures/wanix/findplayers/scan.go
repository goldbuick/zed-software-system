package findplayers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"path"
	"sort"
	"strings"
)

var ErrExportNotReady = errors.New("zedcafe export not ready")

// isincompletejson reports empty/truncated JSON typical of mid-push Create-then-Write.
func isincompletejson(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, io.ErrUnexpectedEOF) {
		return true
	}
	return strings.Contains(err.Error(), "unexpected end of JSON input")
}

// UnmarshalJSONOrNotReady unmarshals data into dest. Empty or truncated JSON
// returns ErrExportNotReady so callers can retry during host export push.
func UnmarshalJSONOrNotReady(rel string, data []byte, dest any) error {
	if len(data) == 0 {
		return fmt.Errorf("parse %s: %w", rel, ErrExportNotReady)
	}
	if err := json.Unmarshal(data, dest); err != nil {
		if isincompletejson(err) {
			return fmt.Errorf("parse %s: %w", rel, ErrExportNotReady)
		}
		return fmt.Errorf("parse %s: %w", rel, err)
	}
	return nil
}

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
	PlayerPaths []string `json:"playerPaths"`
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

func markplayerpath(paths map[string]struct{}, rel string) {
	if rel == "" {
		return
	}
	paths[path.Clean(rel)] = struct{}{}
}

func sortedplayerpaths(paths map[string]struct{}) []string {
	if len(paths) == 0 {
		return nil
	}
	out := make([]string, 0, len(paths))
	for rel := range paths {
		out = append(out, rel)
	}
	sort.Strings(out)
	return out
}

func isplayerelement(kind string, id string) bool {
	if kind == "player" {
		return true
	}
	return ispid(id)
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
	playerpaths map[string]struct{},
) error {
	data, err := readfile(fsys, rel)
	if err != nil {
		return err
	}
	var stats bookStats
	if err := UnmarshalJSONOrNotReady(rel, data, &stats); err != nil {
		return err
	}
	parts := strings.Split(rel, "/")
	if len(parts) < 2 {
		return fmt.Errorf("unexpected book stats path: %s", rel)
	}
	bookdir := parts[0]
	found := false
	for _, id := range stats.ActiveList {
		if !ispid(id) {
			continue
		}
		found = true
		p := ensureplayer(players, id)
		p.Active = true
		if p.Book == "" {
			p.Book = bookdir
		}
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
		found = true
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
	if found {
		markplayerpath(playerpaths, rel)
	}
	return nil
}

func scanboardobject(
	rel string,
	data []byte,
	players map[string]*Player,
	playerpaths map[string]struct{},
) error {
	parts := strings.Split(rel, "/")
	if len(parts) < 5 {
		return nil
	}
	bookdir := parts[0]
	pagedir := parts[1]
	filename := parts[len(parts)-1]
	objid := strings.TrimSuffix(filename, ".json")

	var obj boardObject
	if err := UnmarshalJSONOrNotReady(rel, data, &obj); err != nil {
		return err
	}
	if !isplayerelement(obj.Kind, obj.ID) && !isplayerelement(obj.Kind, objid) {
		return nil
	}
	markplayerpath(playerpaths, rel)

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

func scanobjectelement(
	rel string,
	data []byte,
	players map[string]*Player,
	playerpaths map[string]struct{},
) error {
	parts := strings.Split(rel, "/")
	if len(parts) < 4 {
		return nil
	}
	bookdir := parts[0]
	pagedir := parts[1]

	var obj boardObject
	if err := UnmarshalJSONOrNotReady(rel, data, &obj); err != nil {
		return err
	}
	id := obj.ID
	if !isplayerelement(obj.Kind, id) {
		return nil
	}
	markplayerpath(playerpaths, rel)
	if id == "" && strings.HasPrefix(pagedir, "player-") {
		id = strings.TrimPrefix(pagedir, "player-")
	}
	if !ispid(id) {
		return nil
	}
	p := ensureplayer(players, id)
	p.Onboard = true
	if p.Book == "" {
		p.Book = bookdir
	}
	// Prefer board/objects placement for Page; object/element.json often lives
	// under player-* codepages that are not the walkable board.
	if p.Page == "" {
		p.Page = pagedir
	}
	if obj.Kind != "" {
		p.Kind = obj.Kind
	}
	if p.X == nil {
		p.X = intfromcoord(obj.X)
	}
	if p.Y == nil {
		p.Y = intfromcoord(obj.Y)
	}
	markplayerpath(playerpaths, rel)
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
	playerpaths := make(map[string]struct{})
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
		case strings.HasSuffix(rel, "/stats.json") && strings.Count(rel, "/") == 1:
			if err := scanbookstats(fsys, rel, players, playerpaths); err != nil {
				walkerr = err
				if errors.Is(err, ErrExportNotReady) {
					return err
				}
			}
		case strings.Contains(rel, "/board/objects/") && strings.HasSuffix(rel, ".json"):
			data, err := readfile(fsys, rel)
			if err != nil {
				walkerr = err
				return nil
			}
			if err := scanboardobject(rel, data, players, playerpaths); err != nil {
				walkerr = err
				if errors.Is(err, ErrExportNotReady) {
					return err
				}
			}
		case strings.HasSuffix(rel, "/object/element.json"):
			data, err := readfile(fsys, rel)
			if err != nil {
				walkerr = err
				return nil
			}
			if err := scanobjectelement(rel, data, players, playerpaths); err != nil {
				walkerr = err
				if errors.Is(err, ErrExportNotReady) {
					return err
				}
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
		PlayerPaths: sortedplayerpaths(playerpaths),
		Players:     out,
	}, nil
}
