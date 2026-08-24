import { buildboxframe } from 'zss/gadget/boxframe'
import {
  BOARD_TV_COLS,
  BOARD_TV_COMPOSITOR_HEIGHT,
  BOARD_TV_COMPOSITOR_SCALE,
  BOARD_TV_COMPOSITOR_WIDTH,
  BOARD_TV_ROWS,
} from 'zss/feature/mediaqueue/constants'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'

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

describe('board tv compositor footprint', () => {
  it('compositor canvas matches full tv cells at default draw scale', () => {
    expect(BOARD_TV_COLS).toBe(40)
    expect(BOARD_TV_ROWS).toBe(15)
    expect(BOARD_TV_COMPOSITOR_SCALE).toBe(2)
    expect(BOARD_TV_COMPOSITOR_WIDTH).toBe(
      BOARD_TV_COLS * CHAR_WIDTH * BOARD_TV_COMPOSITOR_SCALE,
    )
    expect(BOARD_TV_COMPOSITOR_HEIGHT).toBe(
      BOARD_TV_ROWS * CHAR_HEIGHT * BOARD_TV_COMPOSITOR_SCALE,
    )
    expect(BOARD_TV_COMPOSITOR_WIDTH).toBe(640)
    expect(BOARD_TV_COMPOSITOR_HEIGHT).toBe(420)
  })
})
