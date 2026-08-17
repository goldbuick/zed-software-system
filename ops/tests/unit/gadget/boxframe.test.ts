import { buildboxframe } from 'zss/gadget/boxframe'
import {
  BOARD_TV_BORDER_CELLS,
  BOARD_TV_COLS,
  BOARD_TV_COMPOSITOR_HEIGHT,
  BOARD_TV_COMPOSITOR_SCALE,
  BOARD_TV_COMPOSITOR_WIDTH,
  BOARD_TV_INNER_COLS,
  BOARD_TV_INNER_ROWS,
  BOARD_TV_ROWS,
  boardtvinnerpixels,
} from 'zss/feature/mediaqueue/constants'

describe('buildboxframe', () => {
  it('draws cp437 corners and edges for a 40x15 frame', () => {
    const frame = buildboxframe(40, 15)
    const idx = (x: number, y: number) => x + y * 40

    expect(frame.char[idx(0, 0)]).toBe(218)
    expect(frame.char[idx(39, 0)]).toBe(191)
    expect(frame.char[idx(0, 14)]).toBe(192)
    expect(frame.char[idx(39, 14)]).toBe(217)
    expect(frame.char[idx(20, 0)]).toBe(196)
    expect(frame.char[idx(0, 7)]).toBe(179)
    expect(frame.char[idx(1, 1)]).toBe(0)
  })
})

describe('board tv inner viewport', () => {
  it('insets one cell border from outer tv size', () => {
    expect(BOARD_TV_BORDER_CELLS).toBe(1)
    expect(BOARD_TV_INNER_COLS).toBe(BOARD_TV_COLS - 2)
    expect(BOARD_TV_INNER_ROWS).toBe(BOARD_TV_ROWS - 2)
    expect(BOARD_TV_INNER_COLS).toBe(38)
    expect(BOARD_TV_INNER_ROWS).toBe(13)
  })

  it('boardtvinnerpixels scales inner cells by char size', () => {
    expect(boardtvinnerpixels(16, 28)).toEqual({
      width: 38 * 16,
      height: 13 * 28,
    })
  })

  it('compositor canvas matches inner pixels at default draw scale', () => {
    expect(BOARD_TV_COMPOSITOR_SCALE).toBe(2)
    expect(boardtvinnerpixels(16, 28)).toEqual({
      width: BOARD_TV_COMPOSITOR_WIDTH,
      height: BOARD_TV_COMPOSITOR_HEIGHT,
    })
    expect(BOARD_TV_COMPOSITOR_WIDTH).toBe(608)
    expect(BOARD_TV_COMPOSITOR_HEIGHT).toBe(364)
  })
})
