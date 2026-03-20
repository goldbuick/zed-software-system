import { radToDeg } from 'maath/misc'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { PT } from 'zss/words/types'

import { CHAR_RAY_MARGIN } from './types'

/** Tile-space Y scale so ray length matches `lightingmixmaxrange` pixel geometry. */
export const LIGHTING_RAY_TILE_YSCALE = CHAR_HEIGHT / CHAR_WIDTH

/** Pad shadow wedges so integer-degree ray tests do not leak past cell silhouettes. */
const LIGHTING_MIX_MAX_RANGE_PAD = 1

/**
 * Lookup objects use a centered occluder of this fraction of the glyph cell (terrain uses full cell).
 * Smaller values narrow object shadows (e.g. boulders vs walls); too small risks corner light leaks.
 */
export const LIGHTING_OBJECT_OCCLUDER_CELL_FRAC = 0.5

export type LightingOccluderKind = 'terrain' | 'object'

function lightingdegmod360(d: number): number {
  let x = d % 360
  if (x < 0) {
    x += 360
  }
  return x
}

/**
 * Angular sector from source cell center to occluder corners (degrees, inclusive).
 * Uses float corner angles then conservative floor/ceil (+ pad); avoids shrinking wedges
 * from rounding each corner before min/max (corner light leaks).
 * `object` uses a centered sub-rect of the tile so props do not cast wall-wide cones.
 */
export function lightingmixmaxrange(
  from: PT,
  dest: PT,
  kind: LightingOccluderKind = 'terrain',
): [number, number] {
  const fromx = (from.x + 0.5) * CHAR_WIDTH
  const fromy = (from.y + 0.5) * CHAR_HEIGHT

  let destleft: number
  let desttop: number
  let occw: number
  let occh: number
  let margin: number

  if (kind === 'terrain') {
    destleft = dest.x * CHAR_WIDTH
    desttop = dest.y * CHAR_HEIGHT
    occw = CHAR_WIDTH
    occh = CHAR_HEIGHT
    margin = CHAR_RAY_MARGIN
  } else {
    occw = CHAR_WIDTH * LIGHTING_OBJECT_OCCLUDER_CELL_FRAC
    occh = CHAR_HEIGHT * LIGHTING_OBJECT_OCCLUDER_CELL_FRAC
    const destcx = dest.x * CHAR_WIDTH + CHAR_WIDTH * 0.5
    const destcy = dest.y * CHAR_HEIGHT + CHAR_HEIGHT * 0.5
    destleft = destcx - occw * 0.5
    desttop = destcy - occh * 0.5
    margin = Math.max(
      1,
      Math.round(CHAR_RAY_MARGIN * LIGHTING_OBJECT_OCCLUDER_CELL_FRAC),
    )
  }

  const dx = destleft - fromx
  const dy = desttop - fromy

  const angles = [
    Math.atan2(dy - margin, dx - margin),
    Math.atan2(dy - margin, dx + occw + margin),
    Math.atan2(dy + occh + margin, dx - margin),
    Math.atan2(dy + occh + margin, dx + occw + margin),
  ]

  const degs = angles.map((v) => radToDeg(v))
  const minfloat = Math.min(...degs)
  const maxfloat = Math.max(...degs)
  const spandeg = maxfloat - minfloat

  if (spandeg <= 180) {
    const lo = Math.floor(minfloat) - LIGHTING_MIX_MAX_RANGE_PAD
    const hi = Math.ceil(maxfloat) + LIGHTING_MIX_MAX_RANGE_PAD
    return [lo, hi]
  }

  const t = degs.map((d) => lightingdegmod360(d))
  const minc = Math.min(...t)
  const maxc = Math.max(...t)
  const span360 = maxc - minc
  const pad = LIGHTING_MIX_MAX_RANGE_PAD

  if (span360 <= 180) {
    const lo360 = minc - pad
    const hi360 = maxc + pad
    return lightingmixmaxrangefrom360arc(lo360, hi360, false)
  }

  const lo360 = maxc - pad
  const hi360 = minc + pad
  return lightingmixmaxrangefrom360arc(lo360, hi360, true)
}

/** Map a (possibly out-of-range) arc in degrees on [0,360) to signed pair for `lightingrayshade`. */
function lightingmixmaxrangefrom360arc(
  lo360: number,
  hi360: number,
  wrapped: boolean,
): [number, number] {
  const lo = lightingdegmod360(lo360)
  const hi = lightingdegmod360(hi360)
  if (!wrapped) {
    if (lo <= 180 && hi <= 180) {
      return [lo, hi]
    }
    if (lo > 180 && hi > 180) {
      return [lo - 360, hi - 360]
    }
    if (lo > 180 && hi <= 180) {
      return [lo - 360, hi]
    }
    return [lo, hi - 360]
  }
  if (lo <= 180 && hi <= 180) {
    return [lo, hi]
  }
  if (lo > 180 && hi > 180) {
    return [lo, hi]
  }
  if (lo > 180 && hi <= 180) {
    return [lo, hi]
  }
  return [lo, hi - 360]
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
