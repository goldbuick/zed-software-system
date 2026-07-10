/** Mirrors ops/fixtures/wanix/greenring/ring.go for Jest coverage. */
export const BoardWidth = 60
export const BoardHeight = 25
export const BoardSize = BoardWidth * BoardHeight
export const ColorGreen = 10
export const ColorBlack = 0
export const RingChar = 177

export const RingOffsets: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

export function TerrainIndex(x: number, y: number): number {
  if (x < 0 || y < 0 || x >= BoardWidth || y >= BoardHeight) {
    return -1
  }
  return y * BoardWidth + x
}

export function RingCells(cx: number, cy: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < RingOffsets.length; ++i) {
    const x = cx + RingOffsets[i][0]
    const y = cy + RingOffsets[i][1]
    if (TerrainIndex(x, y) < 0) {
      continue
    }
    out.push([x, y])
  }
  return out
}

export function PaintCellDisplay(
  cell: Record<string, unknown> | null | undefined,
  char: number,
  fg: number,
  bg: number,
): Record<string, unknown> {
  const out = cell && typeof cell === 'object' ? { ...cell } : {}
  out.char = char
  out.color = fg
  out.bg = bg
  return out
}

export function PaintGreenRing(
  terrain: unknown[],
  cx: number,
  cy: number,
): unknown[] {
  const grown =
    terrain.length >= BoardSize
      ? [...terrain]
      : [...terrain, ...Array(BoardSize - terrain.length).fill(null)]
  const cells = RingCells(cx, cy)
  for (let i = 0; i < cells.length; ++i) {
    const idx = TerrainIndex(cells[i][0], cells[i][1])
    grown[idx] = PaintCellDisplay(
      grown[idx] as Record<string, unknown> | null,
      RingChar,
      ColorGreen,
      ColorBlack,
    )
  }
  return grown
}
