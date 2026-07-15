package greenring

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestPaintCellDisplayPreservesKind(t *testing.T) {
	cell := PaintCellDisplay(map[string]any{"kind": "floor", "char": 1}, RingChar, ColorGreen, ColorBlack)
	if cell["kind"] != "floor" {
		t.Fatalf("kind lost: %v", cell["kind"])
	}
	if cell["char"] != RingChar || cell["color"] != ColorGreen || cell["bg"] != ColorBlack {
		t.Fatalf("display fields: %v", cell)
	}
}

func TestPaintGreenRingMergesDisplay(t *testing.T) {
	terrain := make([]any, BoardSize)
	terrain[TerrainIndex(5, 5)] = map[string]any{"kind": "solid", "char": 178}
	out := PaintGreenRing(terrain, 5, 5)
	cell := out[TerrainIndex(6, 5)].(map[string]any)
	if cell["char"] != RingChar || cell["color"] != ColorGreen {
		t.Fatalf("ring cell: %v", cell)
	}
}

func writeterraincell(t *testing.T, dir, book, page string, index int, body string) {
	t.Helper()
	path := filepath.Join(dir, book, page, "board", "terrain", strconv.Itoa(index)+".json")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestResolveBoardPageDirByIdSuffix(t *testing.T) {
	dir := t.TempDir()
	book := "cool-book1"
	page := "title-sid_abc"
	writeterraincell(t, dir, book, page, 0, "{}\n")
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
	if err := os.MkdirAll(filepath.Dir(obj), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(obj, []byte("{}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	writeterraincell(t, dir, book, page, 0, "{}\n")
	got, err := ResolveBoardPageDir(dir, book, "wrong", "pid_1")
	if err != nil {
		t.Fatal(err)
	}
	if got != page {
		t.Fatalf("got %q want %q", got, page)
	}
}

func TestApplyRingToBoardWritesCells(t *testing.T) {
	dir := t.TempDir()
	book := "cool-book1"
	page := "title-sid_abc"
	cx, cy := 5, 5
	for _, cell := range RingCells(cx, cy) {
		idx := TerrainIndex(cell[0], cell[1])
		writeterraincell(t, dir, book, page, idx, "{\"kind\":\"fake\"}\n")
	}
	if err := ApplyRingToBoard(dir, book, page, cx, cy); err != nil {
		t.Fatal(err)
	}
	idx := TerrainIndex(6, 5)
	data, err := os.ReadFile(filepath.Join(dir, book, page, "board", "terrain", strconv.Itoa(idx)+".json"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), `"char":177`) {
		t.Fatalf("expected painted cell, got %s", data)
	}
}
