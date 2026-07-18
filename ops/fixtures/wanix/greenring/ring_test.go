package greenring

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPaintGreenRingMergesDisplay(t *testing.T) {
	terrain := []any{
		map[string]any{"kind": "fake", "char": 1},
	}
	terrain = PaintGreenRing(terrain, 0, 0)
	cell, ok := terrain[TerrainIndex(1, 0)].(map[string]any)
	if !ok {
		t.Fatalf("expected painted neighbor map, got %T", terrain[TerrainIndex(1, 0)])
	}
	if cell["char"] != RingChar || cell["color"] != ColorGreen || cell["bg"] != ColorBlack {
		t.Fatalf("unexpected paint %#v", cell)
	}
	origin, ok := terrain[0].(map[string]any)
	if !ok || origin["kind"] != "fake" {
		t.Fatalf("origin should keep kind, got %#v", terrain[0])
	}
}

func TestResolveBoardPageDirByIdSuffix(t *testing.T) {
	dir := t.TempDir()
	book := "cool-book1"
	page := "title-sid_abc"
	terrain := filepath.Join(dir, book, page, "board", "terrain.json")
	if err := os.MkdirAll(filepath.Dir(terrain), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(terrain, []byte("[]\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := ResolveBoardPageDir(dir, book, "sid_abc", "")
	if err != nil {
		t.Fatal(err)
	}
	if got != page {
		t.Fatalf("got %q want %q", got, page)
	}
}

func TestResolveBoardPageDirByPlayerObject(t *testing.T) {
	dir := t.TempDir()
	book := "cool-book1"
	page := "area-sid_xyz"
	obj := filepath.Join(dir, book, page, "board", "objects", "pid_1.json")
	terrain := filepath.Join(dir, book, page, "board", "terrain.json")
	if err := os.MkdirAll(filepath.Dir(obj), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(obj, []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(terrain, []byte("[]\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := ResolveBoardPageDir(dir, book, "wrong", "pid_1")
	if err != nil {
		t.Fatal(err)
	}
	if got != page {
		t.Fatalf("got %q want %q", got, page)
	}
}

func TestApplyRingToBoardWritesArray(t *testing.T) {
	dir := t.TempDir()
	book := "cool-book1"
	page := "title-sid_abc"
	terrain := filepath.Join(dir, book, page, "board", "terrain.json")
	if err := os.MkdirAll(filepath.Dir(terrain), 0o755); err != nil {
		t.Fatal(err)
	}
	cells := make([]any, BoardSize)
	cells[0] = map[string]any{"kind": "fake"}
	raw, err := json.Marshal(cells)
	if err != nil {
		t.Fatal(err)
	}
	raw = append(raw, '\n')
	if err := os.WriteFile(terrain, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := ApplyRingToBoard(dir, book, page, 5, 5); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(terrain)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), `"char":177`) {
		t.Fatalf("expected painted cell, got %s", data)
	}
}
