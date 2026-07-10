package greenring

import "testing"

func TestRingCellsCenter(t *testing.T) {
	cells := RingCells(10, 10)
	if len(cells) != 8 {
		t.Fatalf("expected 8 cells, got %d", len(cells))
	}
}

func TestRingCellsCorner(t *testing.T) {
	cells := RingCells(0, 0)
	if len(cells) != 3 {
		t.Fatalf("expected 3 cells at corner, got %d", len(cells))
	}
}

func TestPaintGreenRing(t *testing.T) {
	terrain := PaintGreenRing(nil, 5, 5)
	if len(terrain) != BoardSize {
		t.Fatalf("expected terrain len %d, got %d", BoardSize, len(terrain))
	}
	idx := TerrainIndex(6, 5)
	cell, ok := terrain[idx].(map[string]any)
	if !ok {
		t.Fatalf("expected map at ring cell")
	}
	if cell["color"] != ColorGreen {
		t.Fatalf("expected color %d, got %v", ColorGreen, cell["color"])
	}
	if cell["char"] != RingChar {
		t.Fatalf("expected char %d, got %v", RingChar, cell["char"])
	}
}

func TestTerrainIndexOOB(t *testing.T) {
	if TerrainIndex(-1, 0) != -1 {
		t.Fatal("expected -1 for oob")
	}
	if TerrainIndex(0, BoardHeight) != -1 {
		t.Fatal("expected -1 for oob y")
	}
}
