import TinySDF from '@mapbox/tiny-sdf'
import { DataTexture, RedIntegerFormat, UnsignedByteType } from 'three'

const SLOT_SIZE = 64
const ATLAS_COLS = 32
const ATLAS_SIZE = ATLAS_COLS * SLOT_SIZE
const SLOT_PADDING = 2

export type GlyphSlot = {
  slotx: number
  sloty: number
  /** 0..1, distance from top of slot to baseline (for vertical alignment) */
  baseline_from_top: number
}

let nextslot = 0
let atlastexture: DataTexture | null = null
let tinysdf: InstanceType<typeof TinySDF> | null = null

const glyphcache = new Map<number, GlyphSlot>()
const atlasdata = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE)

function gettinysdf(): InstanceType<typeof TinySDF> {
  const fontSize = SLOT_SIZE - SLOT_PADDING * 2
  tinysdf ??= new TinySDF({
    fontSize,
    radius: 4,
    buffer: 1,
    cutoff: 0.6,
    fontWeight: '300',
    fontFamily: 'monospace',
  })
  return tinysdf
}

function ensureglyph(codepoint: number): GlyphSlot | null {
  const cached = glyphcache.get(codepoint)
  if (cached) {
    return cached
  }
  let s: string
  try {
    s = String.fromCodePoint(codepoint)
  } catch {
    return null
  }
  const sdf = gettinysdf()
  const glyph = sdf.draw(s)
  if (!glyph || glyph.width === 0 || glyph.height === 0) {
    return null
  }
  const slotx = nextslot % ATLAS_COLS
  const sloty = Math.floor(nextslot / ATLAS_COLS)
  nextslot++
  if (sloty >= ATLAS_COLS) {
    return null
  }
  const usable = SLOT_SIZE - SLOT_PADDING * 2
  const copyw = Math.min(glyph.width, usable)
  const copyh = Math.min(glyph.height, usable)
  const offsetx = Math.floor((usable - copyw) / 2)
  const offsety = Math.floor((usable - copyh) / 2)
  const dstx = slotx * SLOT_SIZE + SLOT_PADDING + offsetx
  const dsty = sloty * SLOT_SIZE + SLOT_PADDING + offsety
  for (let y = 0; y < copyh; y++) {
    for (let x = 0; x < copyw; x++) {
      const src = y * glyph.width + x
      const dst = (dsty + y) * ATLAS_SIZE + (dstx + x)
      atlasdata[dst] = glyph.data[src]
    }
  }
  const baseline_from_top = Math.max(
    0,
    Math.min(1, (SLOT_PADDING + offsety + glyph.glyphTop) / SLOT_SIZE),
  )
  const slot: GlyphSlot = { slotx, sloty, baseline_from_top }
  glyphcache.set(codepoint, slot)
  if (atlastexture) {
    atlastexture.needsUpdate = true
  }
  return slot
}

export function getunicodeatlas(): DataTexture {
  if (!atlastexture) {
    atlastexture = new DataTexture(
      atlasdata,
      ATLAS_SIZE,
      ATLAS_SIZE,
      RedIntegerFormat,
      UnsignedByteType,
    )
    atlastexture.needsUpdate = true
  }
  return atlastexture
}

export function lookupglyph(codepoint: number): GlyphSlot | null {
  return ensureglyph(codepoint)
}

/**
 * Resolves with the glyph slot after creating it asynchronously so the main
 * thread is not blocked. Use this when building the overlay for many cells.
 */
export function lookupglyphasync(codepoint: number): Promise<GlyphSlot | null> {
  const cached = glyphcache.get(codepoint)
  if (cached) {
    return Promise.resolve(cached)
  }
  return new Promise((resolve) => {
    const run = (): void => {
      resolve(ensureglyph(codepoint))
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 50 })
    } else {
      setTimeout(run, 0)
    }
  })
}

export function invalidateatlas(): void {
  if (atlastexture) {
    atlastexture.needsUpdate = true
  }
}

export const UNICODE_ATLAS_COLS = ATLAS_COLS
export const UNICODE_SLOT_SIZE = SLOT_SIZE
export const UNICODE_ATLAS_SIZE = ATLAS_SIZE
