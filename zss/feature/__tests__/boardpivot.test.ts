import { boardpivot, boardpivotgroup } from 'zss/feature/boardpivot'
import {
  pivotbuildintegeredges,
  pivotcell,
  pivotcellinteger,
} from 'zss/feature/boardpivotmath'
import { memoryreadterrain } from 'zss/memory/boardaccess'
import { memorycreateboard } from 'zss/memory/boardlifecycle'
import { memoryinitboard, memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryresetbooks } from 'zss/memory/session'
import {
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION, PT } from 'zss/words/types'

function installbookwithboard(
  boardid: string,
  board: ReturnType<typeof memorycreateboard>,
) {
  board.id = boardid
  board.name = boardid
  const book: BOOK = {
    id: 'book_boardpivot_test',
    name: 'main',
    timestamp: 0,
    activelist: [],
    pages: [
      {
        id: boardid,
        code: '',
        board,
        stats: { type: CODE_PAGE_TYPE.BOARD, name: boardid },
      },
    ],
    flags: {},
  }
  memoryresetbooks([book])
  READ_CONTEXT.book = book
  return book
}

function terrainat(
  board: NonNullable<ReturnType<typeof memoryreadboardbyaddress>>,
  pt: PT,
) {
  return memoryreadterrain(board, pt.x, pt.y)
}

describe('boardpivotmath', () => {
  it('leaves cell fixed at theta 0', () => {
    const p = pivotcell(3, 4, BOARD_WIDTH, BOARD_HEIGHT, 0)
    expect(p).toEqual({ x: 3, y: 4 })
  })

  it('matches pivotcellinteger with prebuilt edges', () => {
    const theta = 0.15
    const w = BOARD_WIDTH
    const h = BOARD_HEIGHT
    const { xedge, yedge } = pivotbuildintegeredges(w, h, theta)
    expect(pivotcellinteger(2, 3, w, h, xedge, yedge)).toEqual(
      pivotcell(2, 3, w, h, theta),
    )
  })

  it('keeps a bijection after many −45° steps (no lost / doubled cells)', () => {
    const w = 12
    const h = 8
    const theta = (-45 * Math.PI) / 180
    const { xedge, yedge } = pivotbuildintegeredges(w, h, theta)
    const forward = (src: number) => {
      const ix = src % w
      const iy = Math.floor(src / w)
      const p = pivotcellinteger(ix, iy, w, h, xedge, yedge)
      return p.x + p.y * w
    }
    let step = (i: number) => i
    for (let s = 0; s < 16; ++s) {
      const prev = step
      step = (i: number) => forward(prev(i))
    }
    const seen = new Set<number>()
    for (let i = 0; i < w * h; ++i) {
      seen.add(step(i))
    }
    expect(seen.size).toBe(w * h)
  })
})

describe('boardpivot rectangular', () => {
  afterEach(() => {
    READ_CONTEXT.book = undefined
    memoryresetbooks([])
  })

  it('preserves terrain outside the pivot sub-rectangle', () => {
    const board = memorycreateboard()
    expect(board.terrain.length).toBe(BOARD_SIZE)
    const outside: PT = { x: 10, y: 10 }
    board.terrain[outside.x + outside.y * BOARD_WIDTH] = {
      kind: 'outside_marker',
      x: outside.x,
      y: outside.y,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bp_rect', board)
    const b = memoryreadboardbyaddress('bp_rect')
    expect(b).toBeDefined()

    const ok = boardpivot(
      'bp_rect',
      0,
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      '',
      'terrain',
    )
    expect(ok).toBe(true)
    expect(terrainat(b!, outside)?.kind).toBe('outside_marker')
  })

  it('theta 0 is identity on a small rectangle', () => {
    const board = memorycreateboard()
    board.terrain[0] = {
      kind: 'a',
      x: 0,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    board.terrain[1] = {
      kind: 'b',
      x: 1,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bp_id', board)
    const b = memoryreadboardbyaddress('bp_id')!
    memoryinitboard(b)

    const ok = boardpivot(
      'bp_id',
      0,
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      '',
      'terrain',
    )
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 0, y: 0 })?.kind).toBe('a')
    expect(terrainat(b, { x: 1, y: 0 })?.kind).toBe('b')
  })
})

describe('boardpivotgroup', () => {
  afterEach(() => {
    READ_CONTEXT.book = undefined
    memoryresetbooks([])
  })

  it('returns false when no elements match the group', () => {
    const board = memorycreateboard()
    board.terrain[0] = {
      kind: 'solo',
      x: 0,
      y: 0,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bp_nogrp', board)
    memoryinitboard(memoryreadboardbyaddress('bp_nogrp'))

    const ok = boardpivotgroup('bp_nogrp', 0, '', 'missing_group')
    expect(ok).toBe(false)
  })

  it('leaves three group terrain tiles in place at theta 0', () => {
    const board = memorycreateboard()
    const y = 3
    for (let x = 5; x <= 7; ++x) {
      board.terrain[x + y * BOARD_WIDTH] = {
        kind: `t${x}`,
        x,
        y,
        collision: COLLISION.ISWALK,
        group: 'pivotg',
      }
    }
    board.terrain[8 + y * BOARD_WIDTH] = {
      kind: 'floor',
      x: 8,
      y,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bp_grp3', board)
    const b = memoryreadboardbyaddress('bp_grp3')!
    memoryinitboard(b)

    const ok = boardpivotgroup('bp_grp3', 0, '', 'pivotg')
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 5, y })?.kind).toBe('t5')
    expect(terrainat(b, { x: 6, y })?.kind).toBe('t6')
    expect(terrainat(b, { x: 7, y })?.kind).toBe('t7')
    expect(terrainat(b, { x: 8, y })?.kind).toBe('floor')
  })
})

describe('boardpivot dispatch', () => {
  afterEach(() => {
    READ_CONTEXT.book = undefined
    memoryresetbooks([])
  })

  it('routes unknown targetset string to boardpivotgroup', () => {
    const board = memorycreateboard()
    const y = 2
    board.terrain[1 + y * BOARD_WIDTH] = {
      kind: 'g0',
      x: 1,
      y,
      collision: COLLISION.ISWALK,
      group: 'mygrp',
    }
    installbookwithboard('bp_dispatch', board)
    const b = memoryreadboardbyaddress('bp_dispatch')!
    memoryinitboard(b)

    const ok = boardpivot(
      'bp_dispatch',
      0,
      { x: 0, y: 0 },
      { x: 59, y: 24 },
      '',
      'mygrp',
    )
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 1, y })?.kind).toBe('g0')
  })
})
