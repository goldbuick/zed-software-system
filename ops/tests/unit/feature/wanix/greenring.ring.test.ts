import {
  BoardSize,
  ColorBlack,
  ColorGreen,
  PaintCellDisplay,
  PaintGreenRing,
  RingCells,
  TerrainIndex,
} from './greenring.ringmath'

describe('greenring ring math (TS mirror of Go helpers)', () => {
  it('returns eight neighbors at center', () => {
    expect(RingCells(10, 10)).toHaveLength(8)
  })

  it('clips at corner', () => {
    expect(RingCells(0, 0)).toHaveLength(3)
  })

  it('paints char/fg/bg and keeps kind', () => {
    const cell = PaintCellDisplay(
      { kind: 'floor', char: 1 },
      9,
      ColorGreen,
      ColorBlack,
    )
    expect(cell.kind).toBe('floor')
    expect(cell.char).toBe(9)
    expect(cell.color).toBe(ColorGreen)
    expect(cell.bg).toBe(ColorBlack)
  })

  it('paints green ring into terrain', () => {
    const terrain = PaintGreenRing([], 5, 5)
    expect(terrain).toHaveLength(BoardSize)
    const cell = terrain[TerrainIndex(6, 5)] as {
      color: number
      char: number
      bg: number
    }
    expect(cell.color).toBe(ColorGreen)
    expect(cell.bg).toBe(ColorBlack)
  })
})
