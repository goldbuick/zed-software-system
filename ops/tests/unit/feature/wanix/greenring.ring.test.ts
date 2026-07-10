import {
  BoardSize,
  ColorGreen,
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

  it('paints green ring into terrain', () => {
    const terrain = PaintGreenRing([], 5, 5)
    expect(terrain).toHaveLength(BoardSize)
    const cell = terrain[TerrainIndex(6, 5)] as { color: number; char: number }
    expect(cell.color).toBe(ColorGreen)
  })
})
