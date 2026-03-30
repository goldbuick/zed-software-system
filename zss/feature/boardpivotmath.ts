import { PT } from 'zss/words/types'

/**
 * Board pivot maps: Paeth triple-shear on a torus (`pivotcell` + taper table) vs Mishin-style
 * quantized trig shears (`pivotcellmishin`). Neither is orthogonal “rotate this rectangle”
 * on a non-square board; a future cardinal orthogonal path would be separate from shear tuning.
 */

/** When |cos(θ/2)| ≈ 0, tan(θ/2) is singular (e.g. θ = π mod 2π). */
const PIVOT_COS_HALF_SINGULAR_EPS = 1e-12

/** Default multiplier on Paeth shear coefficients (taper + Mishin trig steps). */
export const PIVOT_SHEAR_SCALE_DEFAULT = 12.5

export type PIVOT_EDGE_ROUND_MODE = 'round' | 'floor' | 'ceil' | 'trunc'

export type PIVOT_MISHIN_ROUND_MODE = 'round' | 'floor' | 'ceil'

/** Optional shear discretization; omitted fields use defaults matching legacy behavior. */
export type PIVOTDISCRETIZATION = {
  /** Scales taper shear coeffs (`pivotbuildintegeredges` / full-board pivot); default `PIVOT_SHEAR_SCALE_DEFAULT`. Mishin uses raw trig. */
  shearscale?: number
  /** How taper edges (`pivotbuildintegeredges`) quantize each line skew. Default `round`. */
  edgeround?: PIVOT_EDGE_ROUND_MODE
  /** How Mishin shears quantize each step. Default `round`. */
  mishinround?: PIVOT_MISHIN_ROUND_MODE
}

export function pivotresolvedisc(disc?: PIVOTDISCRETIZATION): {
  shearscale: number
  edgeround: PIVOT_EDGE_ROUND_MODE
  mishinround: PIVOT_MISHIN_ROUND_MODE
} {
  return {
    shearscale: disc?.shearscale ?? PIVOT_SHEAR_SCALE_DEFAULT,
    edgeround: disc?.edgeround ?? 'round',
    mishinround: disc?.mishinround ?? 'round',
  }
}

/** Map firmware keyword (after `NAME()`) to discretization; unknown → undefined. */
export function pivotdiscfromkeyword(
  name: string,
): PIVOTDISCRETIZATION | undefined {
  switch (name) {
    case 'taper_floor':
      return { edgeround: 'floor' }
    case 'taper_ceil':
      return { edgeround: 'ceil' }
    case 'taper_trunc':
      return { edgeround: 'trunc' }
    case 'mishin_floor':
      return { mishinround: 'floor' }
    case 'mishin_ceil':
      return { mishinround: 'ceil' }
    case 'shear_soft':
      return { shearscale: 10 }
    case 'shear_hard':
      return { shearscale: 15 }
    default:
      return undefined
  }
}

function pivotquantizeedge(n: number, mode: PIVOT_EDGE_ROUND_MODE): number {
  switch (mode) {
    case 'round':
      return Math.round(n)
    case 'floor':
      return Math.floor(n)
    case 'ceil':
      return Math.ceil(n)
    case 'trunc':
      return Math.trunc(n)
  }
}

function pivotquantizemishin(n: number, mode: PIVOT_MISHIN_ROUND_MODE): number {
  switch (mode) {
    case 'round':
      return Math.round(n)
    case 'floor':
      return Math.floor(n)
    case 'ceil':
      return Math.ceil(n)
  }
}

/** Integer torus index wrap. */
export function pivotposmodi(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** True when Paeth shear coefficients are undefined (tan(θ/2) blows up). */
export function pivotthetanearsingular(theta: number): boolean {
  return Math.abs(Math.cos(theta * 0.5)) < PIVOT_COS_HALF_SINGULAR_EPS
}

export function pivotshearcoeffs(
  theta: number,
  shearscale: number = PIVOT_SHEAR_SCALE_DEFAULT,
): {
  xshear: number
  yshear: number
} {
  if (pivotthetanearsingular(theta)) {
    return { xshear: 0, yshear: 0 }
  }
  const alpha = -Math.tan(theta * 0.5)
  const beta = Math.sin(theta)
  return { xshear: shearscale * alpha, yshear: shearscale * beta }
}

/**
 * Per-row / per-column integer skews from continuous linear shear (float coeffs, round per line).
 * Composing three modular shears with these edges is a bijection on the torus, unlike
 * float compose + single floor to grid (which collides on full boards).
 *
 * Note: each pivot is a permutation (no duplicate / missing cells), but shear is not rigid
 * motion on the grid — repeated −45° pivots scramble multi-cell shapes (e.g. text) because
 * neighbor relationships are not preserved. To move a label as a unit, pivot by **group**.
 * Non-default `edgeround` may break bijection; callers should verify for their θ and size.
 */
export function pivotbuildintegeredges(
  w: number,
  h: number,
  theta: number,
  disc?: PIVOTDISCRETIZATION,
): { xedge: number[]; yedge: number[] } {
  const { shearscale, edgeround } = pivotresolvedisc(disc)
  const { xshear, yshear } = pivotshearcoeffs(theta, shearscale)
  const xedge: number[] = new Array(h)
  for (let y = 0; y < h; ++y) {
    const raw = h <= 1 ? xshear : xshear * (1 - (2 * y) / (h - 1))
    xedge[y] = pivotquantizeedge(raw, edgeround)
  }
  const yedge: number[] = new Array(w)
  for (let x = 0; x < w; ++x) {
    const raw = w <= 1 ? yshear : yshear * (1 - (2 * x) / (w - 1))
    yedge[x] = pivotquantizeedge(raw, edgeround)
  }
  return { xedge, yedge }
}

/** Same triple shear as board objects: x, y, x passes with integer edges. */
export function pivotcellinteger(
  ix: number,
  iy: number,
  w: number,
  h: number,
  xedge: number[],
  yedge: number[],
): PT {
  let x = ix
  let y = iy
  x = pivotposmodi(x + xedge[y], w)
  y = pivotposmodi(y + yedge[x], h)
  x = pivotposmodi(x + xedge[y], w)
  return { x, y }
}

/** Dest for one cell; builds edges internally (prefer caching edges for bulk). */
export function pivotcell(
  ix: number,
  iy: number,
  w: number,
  h: number,
  theta: number,
  disc?: PIVOTDISCRETIZATION,
): PT {
  const { xedge, yedge } = pivotbuildintegeredges(w, h, theta, disc)
  return pivotcellinteger(ix, iy, w, h, xedge, yedge)
}

/**
 * Mishin-style discrete Paeth rotation: each shear quantizes `trig * offset` with
 * offsets relative to `(cx, cy)` (defaults: board center `(w-1)/2`, `(h-1)/2`). Same H→V→H
 * order and torus wrap. Board pivot uses bbox center of the targeted region when provided.
 */
export function pivotcellmishin(
  ix: number,
  iy: number,
  w: number,
  h: number,
  theta: number,
  cx?: number,
  cy?: number,
  disc?: PIVOTDISCRETIZATION,
): PT {
  if (w <= 0 || h <= 0 || pivotthetanearsingular(theta)) {
    return { x: ix, y: iy }
  }
  const { mishinround } = pivotresolvedisc(disc)
  const centerx = cx ?? (w <= 1 ? 0 : (w - 1) * 0.5)
  const centery = cy ?? (h <= 1 ? 0 : (h - 1) * 0.5)
  const half = theta * 0.5
  const alpha = -Math.tan(half)
  const beta = Math.sin(theta)
  let x = ix
  let y = iy
  x = pivotposmodi(
    x + pivotquantizemishin(alpha * (y - centery), mishinround),
    w,
  )
  y = pivotposmodi(
    y + pivotquantizemishin(beta * (x - centerx), mishinround),
    h,
  )
  x = pivotposmodi(
    x + pivotquantizemishin(alpha * (y - centery), mishinround),
    w,
  )
  return { x, y }
}

/** Linear index map for property tests — `src` in row-major [0, w*h). */
export function pivotmishinmapindex(
  src: number,
  w: number,
  h: number,
  theta: number,
  disc?: PIVOTDISCRETIZATION,
): number {
  const ix = src % w
  const iy = Math.floor(src / w)
  const p = pivotcellmishin(ix, iy, w, h, theta, undefined, undefined, disc)
  return p.x + p.y * w
}

/** Taper / legacy pivot linear index map for bijection tests. */
export function pivotlegacytapermapindex(
  src: number,
  w: number,
  h: number,
  theta: number,
  disc?: PIVOTDISCRETIZATION,
): number {
  const ix = src % w
  const iy = Math.floor(src / w)
  const p = pivotcell(ix, iy, w, h, theta, disc)
  return p.x + p.y * w
}

/** Count cells where Mishin and taper+edge pivot disagree (for comparisons). */
export function pivotcellmishinvslegacydiffcount(
  w: number,
  h: number,
  theta: number,
): number {
  let n = 0
  for (let iy = 0; iy < h; ++iy) {
    for (let ix = 0; ix < w; ++ix) {
      const a = pivotcell(ix, iy, w, h, theta)
      const b = pivotcellmishin(ix, iy, w, h, theta)
      if (a.x !== b.x || a.y !== b.y) {
        ++n
      }
    }
  }
  return n
}
