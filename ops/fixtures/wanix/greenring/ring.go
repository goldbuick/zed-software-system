package greenring

const (
	BoardWidth  = 60
	BoardHeight = 25
	BoardSize   = BoardWidth * BoardHeight
	// ColorGreen matches zss COLOR.GREEN (fg).
	ColorGreen = 10
	// ColorBlack matches zss COLOR.BLACK (bg).
	ColorBlack = 0
	// RingChar is CP437 medium shade (░).
	RingChar = 177
)

// RingOffsets are the eight neighbors around a cell (Chebyshev ring radius 1).
var RingOffsets = [][2]int{
	{-1, -1}, {0, -1}, {1, -1},
	{-1, 0}, {1, 0},
	{-1, 1}, {0, 1}, {1, 1},
}

// TerrainIndex returns the flat terrain index for (x, y), or -1 if out of bounds.
func TerrainIndex(x, y int) int {
	if x < 0 || y < 0 || x >= BoardWidth || y >= BoardHeight {
		return -1
	}
	return y*BoardWidth + x
}

// RingCells returns in-bounds board cells forming a green ring around (cx, cy).
func RingCells(cx, cy int) [][2]int {
	out := make([][2]int, 0, len(RingOffsets))
	for _, off := range RingOffsets {
		x := cx + off[0]
		y := cy + off[1]
		if TerrainIndex(x, y) < 0 {
			continue
		}
		out = append(out, [2]int{x, y})
	}
	return out
}

// EnsureTerrainLen grows a terrain slice to BoardSize with null placeholders.
func EnsureTerrainLen(terrain []any) []any {
	if len(terrain) >= BoardSize {
		return terrain
	}
	grown := make([]any, BoardSize)
	copy(grown, terrain)
	return grown
}

// PaintCellDisplay sets char / color (fg) / bg on a terrain cell, keeping other fields.
func PaintCellDisplay(cell any, char int, fg int, bg int) map[string]any {
	out, ok := cell.(map[string]any)
	if !ok || out == nil {
		out = map[string]any{}
	}
	out["char"] = char
	out["color"] = fg
	out["bg"] = bg
	return out
}

// PaintGreenRing mutates terrain in place: writes char/fg/bg on ring cells only.
// Does not inspect collision / blocked — only display fields.
func PaintGreenRing(terrain []any, cx, cy int) []any {
	terrain = EnsureTerrainLen(terrain)
	for _, cell := range RingCells(cx, cy) {
		idx := TerrainIndex(cell[0], cell[1])
		if idx < 0 {
			continue
		}
		terrain[idx] = PaintCellDisplay(terrain[idx], RingChar, ColorGreen, ColorBlack)
	}
	return terrain
}
