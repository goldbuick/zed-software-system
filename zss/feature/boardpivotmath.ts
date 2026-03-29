import { PT } from 'zss/words/types'

/**
 * Board pivot maps: Paeth triple-shear on a torus (`pivotcell` + taper table) vs Mishin-style
 * `Math.round(trig * offset)` (`pivotcellmishin`). Neither is orthogonal “rotate this rectangle”
 * on a non-square board; a future cardinal orthogonal path would be separate from shear tuning.
 */

/** When |cos(θ/2)| ≈ 0, tan(θ/2) is singular (e.g. θ = π mod 2π). */
const PIVOT_COS_HALF_SINGULAR_EPS = 1e-12

/** Integer torus index wrap. */
export function pivotposmodi(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** True when Paeth shear coefficients are undefined (tan(θ/2) blows up). */
export function pivotthetanearsingular(theta: number): boolean {
  return Math.abs(Math.cos(theta * 0.5)) < PIVOT_COS_HALF_SINGULAR_EPS
}

export function pivotshearcoeffs(theta: number): {
  xshear: number
  yshear: number
} {
  if (pivotthetanearsingular(theta)) {
    return { xshear: 0, yshear: 0 }
  }
  const alpha = -Math.tan(theta * 0.5)
  const beta = Math.sin(theta)
  return { xshear: 12.5 * alpha, yshear: 12.5 * beta }
}

/**
 * Per-row / per-column integer skews from continuous linear shear (float coeffs, round per line).
 * Composing three modular shears with these edges is a bijection on the torus, unlike
 * float compose + single floor to grid (which collides on full boards).
 *
 * Note: each pivot is a permutation (no duplicate / missing cells), but shear is not rigid
 * motion on the grid — repeated −45° pivots scramble multi-cell shapes (e.g. text) because
 * neighbor relationships are not preserved. To move a label as a unit, pivot by **group**.
 */
export function pivotbuildintegeredges(
  w: number,
  h: number,
  theta: number,
): { xedge: number[]; yedge: number[] } {
  const { xshear, yshear } = pivotshearcoeffs(theta)
  const xedge: number[] = new Array(h)
  for (let y = 0; y < h; ++y) {
    xedge[y] = Math.round(h <= 1 ? xshear : xshear * (1 - (2 * y) / (h - 1)))
  }
  const yedge: number[] = new Array(w)
  for (let x = 0; x < w; ++x) {
    yedge[x] = Math.round(w <= 1 ? yshear : yshear * (1 - (2 * x) / (w - 1)))
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
): PT {
  const { xedge, yedge } = pivotbuildintegeredges(w, h, theta)
  return pivotcellinteger(ix, iy, w, h, xedge, yedge)
}

/**
 * Mishin-style discrete Paeth rotation: each shear uses `Math.round(trig * offset)` with
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
): PT {
  if (w <= 0 || h <= 0 || pivotthetanearsingular(theta)) {
    return { x: ix, y: iy }
  }
  const centerx = cx ?? (w <= 1 ? 0 : (w - 1) * 0.5)
  const centery = cy ?? (h <= 1 ? 0 : (h - 1) * 0.5)
  const half = theta * 0.5
  const alpha = -Math.tan(half)
  const beta = Math.sin(theta)
  let x = ix
  let y = iy
  x = pivotposmodi(x + Math.round(alpha * (y - centery)), w)
  y = pivotposmodi(y + Math.round(beta * (x - centerx)), h)
  x = pivotposmodi(x + Math.round(alpha * (y - centery)), w)
  return { x, y }
}

/** Linear index map for property tests — `src` in row-major [0, w*h). */
export function pivotmishinmapindex(
  src: number,
  w: number,
  h: number,
  theta: number,
): number {
  const ix = src % w
  const iy = Math.floor(src / w)
  const p = pivotcellmishin(ix, iy, w, h, theta)
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
