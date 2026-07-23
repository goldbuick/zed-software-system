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
	ActiveList []string `json:"activelist"`
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

func ispid(id string) bool {
	return strings.HasPrefix(id, "pid_")
}

// IsPID reports player identity ids (pid_*).
func IsPID(id string) bool {
	return ispid(id)
}

func issimonlyflagowner(owner string) bool {
	for _, suf := range []string{
		"_chip",
		"_gadget",
		"_synth",
		"_layers",
		"_tracking",
	} {
		if strings.HasSuffix(owner, suf) {
			return true
		}
	}
	return false
}

// isplayerflagpath reports live player flag bags ({book}/flags/pid_*.json).
func isplayerflagpath(rel string) bool {
	parts := strings.Split(path.Clean(rel), "/")
	if len(parts) != 3 || parts[1] != "flags" || !strings.HasSuffix(parts[2], ".json") {
		return false
	}
	owner := strings.TrimSuffix(parts[2], ".json")
	return ispid(owner) && !issimonlyflagowner(owner)
}

// isplayerobjectpath reports board avatar files (board/objects/pid_*.json).
func isplayerobjectpath(rel string) bool {
	if !strings.Contains(rel, "/board/objects/") || !strings.HasSuffix(rel, ".json") {
		return false
	}
	base := path.Base(rel)
	return ispid(strings.TrimSuffix(base, ".json"))
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
	return fs.ReadFile(fsys, name)
}

func hasboardterrain(fsys fs.FS, bookdir, pagedir string) bool {
	_, err := fs.Stat(fsys, path.Join(bookdir, pagedir, "board", "terrain.json"))
	return err == nil
}

// ResolveBoardPageDirFS finds the export page directory under bookdir that holds
// board/terrain.json. boardhint may be a full dir name or a bare page/board id.
func ResolveBoardPageDirFS(fsys fs.FS, bookdir, boardhint string) (string, error) {
	if boardhint != "" && hasboardterrain(fsys, bookdir, boardhint) {
		return boardhint, nil
	}

	entries, err := fs.ReadDir(fsys, bookdir)
	if err != nil {
		return "", fmt.Errorf("list %s: %w", bookdir, err)
	}
	if boardhint != "" {
		for _, ent := range entries {
			if !ent.IsDir() {
				continue
			}
			name := ent.Name()
			if (name == boardhint || strings.HasSuffix(name, "-"+boardhint)) &&
				hasboardterrain(fsys, bookdir, name) {
				return name, nil
			}
		}
	}
	for _, ent := range entries {
		if !ent.IsDir() || strings.HasPrefix(ent.Name(), "player-") {
			continue
		}
		if hasboardterrain(fsys, bookdir, ent.Name()) {
			return ent.Name(), nil
		}
	}
	return "", fmt.Errorf("no board/terrain.json under %s (hint=%q)", bookdir, boardhint)
}

func applyplayerflags(p *Player, flags map[string]any) {
	if len(flags) == 0 {
		return
	}
	if p.Flags == nil {
		p.Flags = flags
	}
	if board, ok := flags["board"].(string); ok && board != "" {
		p.Board = board
	}
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
	}
	if found {
		markplayerpath(playerpaths, rel)
	}
	return nil
}

func scanplayerflag(
	rel string,
	data []byte,
	players map[string]*Player,
	playerpaths map[string]struct{},
) error {
	if !isplayerflagpath(rel) {
		return nil
	}
	parts := strings.Split(path.Clean(rel), "/")
	bookdir := parts[0]
	id := strings.TrimSuffix(parts[2], ".json")

	var flags map[string]any
	if err := UnmarshalJSONOrNotReady(rel, data, &flags); err != nil {
		return err
	}
	p := ensureplayer(players, id)
	if p.Book == "" {
		p.Book = bookdir
	}
	applyplayerflags(p, flags)
	markplayerpath(playerpaths, rel)
	return nil
}

func scanboardobject(
	rel string,
	data []byte,
	players map[string]*Player,
	playerpaths map[string]struct{},
) error {
	if !isplayerobjectpath(rel) {
		return nil
	}
	parts := strings.Split(rel, "/")
	if len(parts) < 5 {
		return nil
	}
	bookdir := parts[0]
	pagedir := parts[1]
	objid := strings.TrimSuffix(path.Base(rel), ".json")

	var obj boardObject
	if err := UnmarshalJSONOrNotReady(rel, data, &obj); err != nil {
		return err
	}
	id := objid
	if ispid(obj.ID) {
		id = obj.ID
	}
	if !ispid(id) {
		return nil
	}
	markplayerpath(playerpaths, rel)
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

func loadplayerobject(
	fsys fs.FS,
	p *Player,
	players map[string]*Player,
	playerpaths map[string]struct{},
) error {
	if p.Book == "" || p.Board == "" || !ispid(p.ID) {
		return nil
	}
	pagedir, err := ResolveBoardPageDirFS(fsys, p.Book, p.Board)
	if err != nil {
		// Board flag may not match an exported page yet — leave as roster-only.
		return nil
	}
	rel := path.Join(p.Book, pagedir, "board", "objects", p.ID+".json")
	data, err := readfile(fsys, rel)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil
		}
		return err
	}
	return scanboardobject(rel, data, players, playerpaths)
}

// Scan walks a zedcafe export tree using book flags to locate player boards,
// then reads only those boards' board/objects/pid_*.json avatars.
func Scan(fsys fs.FS, exportroot string) (Report, error) {
	if exportroot == "" {
		exportroot = "zedcafe"
	}
	if _, err := fs.Stat(fsys, "stats.json"); err != nil {
		return Report{}, fmt.Errorf("%w: missing stats.json", ErrExportNotReady)
	}

	players := make(map[string]*Player)
	playerpaths := make(map[string]struct{})

	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return Report{}, err
	}
	for _, ent := range entries {
		if !ent.IsDir() {
			continue
		}
		bookdir := ent.Name()
		statsrel := path.Join(bookdir, "stats.json")
		if _, err := fs.Stat(fsys, statsrel); err != nil {
			continue
		}
		if err := scanbookstats(fsys, statsrel, players, playerpaths); err != nil {
			return Report{}, err
		}

		flagsdir := path.Join(bookdir, "flags")
		flagents, err := fs.ReadDir(fsys, flagsdir)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				continue
			}
			return Report{}, err
		}
		for _, fent := range flagents {
			if fent.IsDir() {
				continue
			}
			rel := path.Join(flagsdir, fent.Name())
			if !isplayerflagpath(rel) {
				continue
			}
			data, err := readfile(fsys, rel)
			if err != nil {
				return Report{}, err
			}
			if err := scanplayerflag(rel, data, players, playerpaths); err != nil {
				return Report{}, err
			}
		}
	}

	for _, p := range players {
		if err := loadplayerobject(fsys, p, players, playerpaths); err != nil {
			return Report{}, err
		}
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
