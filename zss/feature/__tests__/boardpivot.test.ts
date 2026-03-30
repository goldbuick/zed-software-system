import { boardpivot, boardpivotgroup } from 'zss/feature/boardpivot'
import {
  pivotbuildintegeredges,
  pivotcell,
  pivotcellinteger,
  pivotcellmishin,
  pivotcellmishinvslegacydiffcount,
  pivotmishinmapindex,
  pivotthetanearsingular,
} from 'zss/feature/boardpivotmath'
import { readtransformfilter } from 'zss/firmware/transforms'
import { indextopt } from 'zss/mapping/2d'
import { memoryreadterrain } from 'zss/memory/boardaccess'
import {
  memorycreateboard,
  memorycreateboardobject,
} from 'zss/memory/boardlifecycle'
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

/** Theta + layout where three horizontal group cells have matching vacated/incoming sets. */
function pivotgroupdisplacementfixture():
  | {
      theta: number
      y: number
      x0: number
      vacated: number[]
      incoming: number[]
    }
  | undefined {
  const y = 10
  const x0 = 20
  for (let step = 1; step < 360 * 8; ++step) {
    const deg = step * 0.125
    const theta = (deg * Math.PI) / 180
    const cx = x0 + 1
    const cy = y
    const idx = (x: number) => x + y * BOARD_WIDTH
    const gset = new Set([idx(x0), idx(x0 + 1), idx(x0 + 2)])
    const dest = new Set<number>()
    for (let k = 0; k < 3; ++k) {
      const p = pivotcellmishin(
        x0 + k,
        y,
        BOARD_WIDTH,
        BOARD_HEIGHT,
        theta,
        cx,
        cy,
      )
      dest.add(p.x + p.y * BOARD_WIDTH)
    }
    const vacated = [...gset].filter((i) => !dest.has(i))
    const incoming = [...dest].filter((i) => !gset.has(i))
    if (
      vacated.length > 0 &&
      incoming.length > 0 &&
      vacated.length === incoming.length
    ) {
      vacated.sort((a, b) => a - b)
      incoming.sort((a, b) => a - b)
      return { theta, y, x0, vacated, incoming }
    }
  }
  return undefined
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

function assertmishinbijection(w: number, h: number, theta: number) {
  const seen = new Set<number>()
  for (let i = 0; i < w * h; ++i) {
    seen.add(pivotmishinmapindex(i, w, h, theta))
  }
  expect(seen.size).toBe(w * h)
}

describe('boardpivotmath mishin', () => {
  it('is identity at theta 0', () => {
    expect(pivotcellmishin(3, 4, BOARD_WIDTH, BOARD_HEIGHT, 0)).toEqual({
      x: 3,
      y: 4,
    })
  })

  it('reports singular theta near half-turn', () => {
    expect(pivotthetanearsingular(Math.PI)).toBe(true)
    expect(pivotthetanearsingular(0)).toBe(false)
  })

  it('legacy pivot is identity when shear is singular (180°)', () => {
    const p = pivotcell(5, 5, 12, 8, Math.PI)
    expect(p).toEqual({ x: 5, y: 5 })
  })

  const mishinanglesdeg = [0, -45, 45, -90, 90]
  for (const deg of mishinanglesdeg) {
    if (deg === 0) {
      continue
    }
    const label = `${deg}°`
    it(`mishin bijection on 12x8 at ${label}`, () => {
      const theta = (deg * Math.PI) / 180
      assertmishinbijection(12, 8, theta)
    })
    it(`mishin bijection on full board at ${label}`, () => {
      const theta = (deg * Math.PI) / 180
      assertmishinbijection(BOARD_WIDTH, BOARD_HEIGHT, theta)
    })
  }

  it('mishin differs from taper pivot for many cells at 90°', () => {
    const theta = (90 * Math.PI) / 180
    const n = pivotcellmishinvslegacydiffcount(12, 8, theta)
    expect(n).toBeGreaterThan(12 * 8 * 0.1)
  })

  it('records comparison count for full board at 90° (sanity)', () => {
    const theta = (90 * Math.PI) / 180
    const n = pivotcellmishinvslegacydiffcount(BOARD_WIDTH, BOARD_HEIGHT, theta)
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThanOrEqual(BOARD_SIZE)
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

  it('sub-rect pivot uses bbox center so Mishin dest differs from board-center pivot', () => {
    const theta = Math.PI / 4
    const x = 21
    const y = 10
    const p1 = { x: 20, y: 10 }
    const p2 = { x: 22, y: 10 }
    const cx = (p1.x + p2.x) / 2
    const cy = (p1.y + p2.y) / 2
    const bx = BOARD_WIDTH <= 1 ? 0 : (BOARD_WIDTH - 1) * 0.5
    const by = BOARD_HEIGHT <= 1 ? 0 : (BOARD_HEIGHT - 1) * 0.5
    const p = pivotcellmishin(x, y, BOARD_WIDTH, BOARD_HEIGHT, theta, cx, cy)
    const q = pivotcellmishin(x, y, BOARD_WIDTH, BOARD_HEIGHT, theta, bx, by)
    expect(p.x !== q.x || p.y !== q.y).toBe(true)
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

  it('relocates non-group terrain from incoming-only cells into vacated group sources', () => {
    const fix = pivotgroupdisplacementfixture()
    expect(fix).toBeDefined()
    const { theta, y, x0, vacated, incoming } = fix!

    const board = memorycreateboard()
    for (let k = 0; k < 3; ++k) {
      const x = x0 + k
      board.terrain[x + y * BOARD_WIDTH] = {
        kind: `tg${k}`,
        x,
        y,
        collision: COLLISION.ISWALK,
        group: 'pivotdisplace',
      }
    }
    const inc0 = incoming[0]
    const incpt = indextopt(inc0, BOARD_WIDTH)
    board.terrain[inc0] = {
      kind: 'floor',
      x: incpt.x,
      y: incpt.y,
      collision: COLLISION.ISWALK,
    }
    installbookwithboard('bp_pgd', board)
    const b = memoryreadboardbyaddress('bp_pgd')!
    memoryinitboard(b)

    const ok = boardpivotgroup('bp_pgd', theta, '', 'pivotdisplace')
    expect(ok).toBe(true)
    const vac0 = vacated[0]
    const vacpt = indextopt(vac0, BOARD_WIDTH)
    expect(terrainat(b, vacpt)?.kind).toBe('floor')
  })

  it('moves object on group terrain by one Mishin pivot and shifts lx/ly once', () => {
    const board = memorycreateboard()
    const y = 4
    const xleft = 11
    for (let x = xleft; x <= xleft + 2; ++x) {
      board.terrain[x + y * BOARD_WIDTH] = {
        kind: `tg${x}`,
        x,
        y,
        collision: COLLISION.ISWALK,
        group: 'ridegrp',
      }
    }
    const ox = xleft
    const oy = y
    const cx = xleft + 1
    const cy = y
    const theta = Math.PI / 4
    const expectpt = pivotcellmishin(
      ox,
      oy,
      BOARD_WIDTH,
      BOARD_HEIGHT,
      theta,
      cx,
      cy,
    )
    memorycreateboardobject(board, {
      id: 'rider_a',
      kind: 'rider',
      x: ox,
      y: oy,
      lx: 0.25,
      ly: -0.5,
      collision: COLLISION.ISWALK,
    })
    installbookwithboard('bp_rider', board)
    const b = memoryreadboardbyaddress('bp_rider')!
    memoryinitboard(b)

    const ok = boardpivotgroup('bp_rider', theta, '', 'ridegrp')
    expect(ok).toBe(true)
    const rider = b.objects['rider_a']
    expect(rider).toBeDefined()
    expect(rider!.x).toBe(expectpt.x)
    expect(rider!.y).toBe(expectpt.y)
    expect(rider!.lx).toBeCloseTo(0.25 + (expectpt.x - ox))
    expect(rider!.ly).toBeCloseTo(-0.5 + (expectpt.y - oy))
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

  it('readtransformfilter: comma rect then group name still routes to group pivot', () => {
    const words = ['90', '0,0,59,24', 'mygrp']
    const { targetset, pt1, pt2 } = readtransformfilter(words, 1)
    expect(targetset).toBe('mygrp')
    expect(pt1).toEqual({ x: 0, y: 0 })
    expect(pt2).toEqual({ x: 59, y: 24 })
    const board = memorycreateboard()
    board.terrain[1 + 2 * BOARD_WIDTH] = {
      kind: 'g0',
      x: 1,
      y: 2,
      collision: COLLISION.ISWALK,
      group: 'mygrp',
    }
    installbookwithboard('bp_rf', board)
    const b = memoryreadboardbyaddress('bp_rf')!
    memoryinitboard(b)
    const ok = boardpivot('bp_rf', 0, pt1, pt2, '', targetset)
    expect(ok).toBe(true)
    expect(terrainat(b, { x: 1, y: 2 })?.kind).toBe('g0')
  })
})
