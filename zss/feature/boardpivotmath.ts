import { PT } from 'zss/words/types'

/** Integer torus index wrap. */
export function pivotposmodi(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function pivotshearcoeffs(theta: number): {
  xshear: number
  yshear: number
} {
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
