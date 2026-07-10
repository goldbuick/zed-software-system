package greenring

import (
	"os"
	"path/filepath"
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
