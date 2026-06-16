import {
  PIVOT_SHEAR_SCALE_DEFAULT,
  pivotbuildintegeredges,
  pivotcell,
  pivotcellinteger,
  pivotcellmishin,
  pivotcellmishinvslegacydiffcount,
  pivotlegacytapermapindex,
  pivotmishinmapindex,
  pivotresolvedisc,
  pivotthetanearsingular,
} from 'zss/feature/boardpivotmath'
import { BOARD_HEIGHT, BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'

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

  it('pivotlegacytapermapindex matches pivotcellinteger with built edges (default disc)', () => {
    const w = 12
    const h = 8
    const theta = (-45 * Math.PI) / 180
    const { xedge, yedge } = pivotbuildintegeredges(w, h, theta)
    for (let i = 0; i < w * h; ++i) {
      const ix = i % w
      const iy = Math.floor(i / w)
      const p = pivotcellinteger(ix, iy, w, h, xedge, yedge)
      expect(pivotlegacytapermapindex(i, w, h, theta)).toBe(p.x + p.y * w)
    }
  })

  it('default pivotresolvedisc matches legacy constants', () => {
    expect(pivotresolvedisc(undefined)).toEqual({
      shearscale: PIVOT_SHEAR_SCALE_DEFAULT,
      edgeround: 'round',
      mishinround: 'round',
    })
  })

  it('taper floor edges differ from round for some angles', () => {
    let found = false
    for (const t of [0.15, 0.4, 0.9, 1.2]) {
      const a = pivotbuildintegeredges(30, 22, t)
      const b = pivotbuildintegeredges(30, 22, t, { edgeround: 'floor' })
      if (a.xedge.join(',') !== b.xedge.join(',')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('mishin floor differs from default round on some cells at -45°', () => {
    const w = 12
    const h = 8
    const theta = (-45 * Math.PI) / 180
    let diff = 0
    for (let i = 0; i < w * h; ++i) {
      if (
        pivotmishinmapindex(i, w, h, theta) !==
        pivotmishinmapindex(i, w, h, theta, { mishinround: 'floor' })
      ) {
        ++diff
      }
    }
    expect(diff).toBeGreaterThan(0)
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
