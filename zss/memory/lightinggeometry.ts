import { radToDeg } from 'maath/misc'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { PT } from 'zss/words/types'

import { CHAR_RAY_MARGIN } from './types'

/** Tile-space Y scale so ray length matches `lightingmixmaxrange` pixel geometry. */
export const LIGHTING_RAY_TILE_YSCALE = CHAR_HEIGHT / CHAR_WIDTH

/** Angular sector from source cell center to dest cell corners (degrees, inclusive). */
export function lightingmixmaxrange(from: PT, dest: PT): [number, number] {
  const angles: number[] = []

  const fromx = (from.x + 0.5) * CHAR_WIDTH
  const fromy = (from.y + 0.5) * CHAR_HEIGHT
  const destx = dest.x * CHAR_WIDTH
  const desty = dest.y * CHAR_HEIGHT
  const dx = destx - fromx
  const dy = desty - fromy

  angles.push(Math.atan2(dy - CHAR_RAY_MARGIN, dx - CHAR_RAY_MARGIN))
  angles.push(
    Math.atan2(dy - CHAR_RAY_MARGIN, dx + CHAR_WIDTH + CHAR_RAY_MARGIN),
  )
  angles.push(
    Math.atan2(dy + CHAR_HEIGHT + CHAR_RAY_MARGIN, dx - CHAR_RAY_MARGIN),
  )
  angles.push(
    Math.atan2(
      dy + CHAR_HEIGHT + CHAR_RAY_MARGIN,
      dx + CHAR_WIDTH + CHAR_RAY_MARGIN,
    ),
  )

  const degs = angles.map((v) => Math.round(radToDeg(v)))
  const minangle = Math.min(...degs)
  const maxangle = Math.max(...degs)
  const diff = maxangle - minangle

  if (diff > 180) {
    const a1 = degs.filter((angle) => angle < 180)
    const a2 = degs.filter((angle) => angle > 180)
    const newminangle = Math.max(...a1)
    const newmaxangle = Math.min(...a2)
    return [newmaxangle, newminangle]
  }
  return [minangle, maxangle]
}

/**
 * Integer heading `d` in [0, 360); `lo`/`hi` match `lightingrayshade` (may be negative; wrap if lo > hi).
 */
function lightinganglematchesblocked(
  d: number,
  lo: number,
  hi: number,
): boolean {
  const ds = d > 180 ? d - 360 : d
  /** `lightingcompresscircularhit` uses [0, 359] for full circle; plain lo..hi would miss ds < 0. */
  if (lo <= hi && hi - lo >= 359) {
    return true
  }
  if (lo > hi) {
    return ds >= lo || ds <= hi
  }
  return ds >= lo && ds <= hi
}

function lightingorrangeintohit(hit: Uint8Array, lo: number, hi: number) {
  for (let d = 0; d < 360; d++) {
    if (lightinganglematchesblocked(d, lo, hi)) {
      hit[d] = 1
    }
  }
}

function lightinghitoverlapsrange(
  hit: Uint8Array,
  lo: number,
  hi: number,
): boolean {
  for (let d = 0; d < 360; d++) {
    if (hit[d] && lightinganglematchesblocked(d, lo, hi)) {
      return true
    }
  }
  return false
}

function lightingcompresscircularhit(hit: Uint8Array): [number, number][] {
  let sum = 0
  for (let d = 0; d < 360; d++) {
    sum += hit[d]
  }
  if (sum === 0) {
    return []
  }
  if (sum === 360) {
    return [[0, 359]]
  }
  const dbl = new Uint8Array(720)
  for (let i = 0; i < 360; i++) {
    dbl[i] = hit[i]
    dbl[i + 360] = hit[i]
  }
  const out: [number, number][] = []
  let i = 0
  while (i < 720) {
    while (i < 720 && !dbl[i]) {
      i++
    }
    if (i === 720) {
      break
    }
    const s = i
    while (i < 720 && dbl[i]) {
      i++
    }
    const e = i - 1
    if (e - s + 1 >= 360) {
      return [[0, 359]]
    }
    const lo = s % 360
    const hi = e % 360
    out.push([lo, hi])
  }
  /** `dbl` repeats `hit`; the same arc appears at `i` and `i + 360`, so drop duplicate `[lo,hi]`. */
  const seen = new Set<string>()
  const uniq: [number, number][] = []
  for (let k = 0; k < out.length; k++) {
    const key = `${out[k][0]},${out[k][1]}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    uniq.push(out[k])
  }
  return uniq
}

function lightingaddrangetoblocked(
  blocked: [number, number, number][],
  range: [number, number, number],
) {
  if (range[2] < 1) {
    blocked.push(range)
    return
  }
  const hit = new Uint8Array(360)
  lightingorrangeintohit(hit, range[0], range[1])

  /**
   * Grow `hit` with every full shadow that touches it, removing those entries.
   * Repeating until a full scan finds none terminates: each removal drops a
   * distinct full block; expanding `hit` can only pull in more blocks, never
   * resurrect removed ones. (The old `while (merged)` + forward scan could
   * cycle forever when order and splits hid overlaps from the next pass.)
   */
  let mergedthispass = true
  while (mergedthispass) {
    mergedthispass = false
    for (let b = blocked.length - 1; b >= 0; b--) {
      const bl = blocked[b]
      if (bl[2] < 1) {
        continue
      }
      if (!lightinghitoverlapsrange(hit, bl[0], bl[1])) {
        continue
      }
      lightingorrangeintohit(hit, bl[0], bl[1])
      blocked.splice(b, 1)
      mergedthispass = true
    }
  }

  const parts = lightingcompresscircularhit(hit)
  for (let p = 0; p < parts.length; p++) {
    blocked.push([parts[p][0], parts[p][1], 1])
  }
}

/** Merge a shadow sector into `blocked` (full shadows union with wrap-aware merge). */
export function memorylightingaddrangetoblocked(
  blocked: [number, number, number][],
  range: [number, number, number],
) {
  lightingaddrangetoblocked(blocked, range)
}
