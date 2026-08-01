import TinySDF from '@mapbox/tiny-sdf'
import {
  DataTexture,
  NearestFilter,
  RedIntegerFormat,
  UnsignedByteType,
} from 'three'

const SLOT_SIZE = 64
const ATLAS_COLS = 32
const ATLAS_SIZE = ATLAS_COLS * SLOT_SIZE
const SLOT_PADDING = 2
/** TinySDF whitespace buffer around glyph ink (must match TinySDF options). */
const SDF_BUFFER = 2

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
    radius: 3,
    buffer: SDF_BUFFER,
    cutoff: 0.35,
    fontWeight: '600',
    fontFamily: '"Hiragino Sans", "Segoe UI", "Noto Sans CJK JP", sans-serif',
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
  // Fit full glyph into slot (scale down if needed) so tall CJK is not clipped.
  const fitscale = Math.min(1, usable / glyph.width, usable / glyph.height)
  const copyw = Math.max(1, Math.floor(glyph.width * fitscale))
  const copyh = Math.max(1, Math.floor(glyph.height * fitscale))
  const offsetx = Math.floor((usable - copyw) / 2)
  const offsety = Math.floor((usable - copyh) / 2)
  const slotoriginx = slotx * SLOT_SIZE
  const slotoriginy = sloty * SLOT_SIZE
  const dstx0 = slotoriginx + SLOT_PADDING + offsetx
  const dsty0 = slotoriginy + SLOT_PADDING + offsety
  for (let y = 0; y < copyh; y++) {
    const srcy = Math.min(glyph.height - 1, Math.floor(y / fitscale))
    for (let x = 0; x < copyw; x++) {
      const srcx = Math.min(glyph.width - 1, Math.floor(x / fitscale))
      const src = srcy * glyph.width + srcx
      const dst = (dsty0 + y) * ATLAS_SIZE + (dstx0 + x)
      atlasdata[dst] = glyph.data[src]
    }
  }
  // Alphabetic baseline within packed slot (for callers that baseline-align).
  const sdfbaseline = SDF_BUFFER + glyph.glyphTop
  const baselineinslot = SLOT_PADDING + offsety + sdfbaseline * fitscale
  const slot: GlyphSlot = {
    slotx,
    sloty,
    baseline_from_top: Math.max(0, Math.min(1, baselineinslot / SLOT_SIZE)),
  }
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
    atlastexture.generateMipmaps = false
    atlastexture.minFilter = NearestFilter
    atlastexture.magFilter = NearestFilter
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

/** Clear packed glyphs and TinySDF so param changes take effect without full reload. */
export function resetunicodeatlas(): void {
  glyphcache.clear()
  nextslot = 0
  tinysdf = null
  atlasdata.fill(0)
  if (atlastexture) {
    atlastexture.needsUpdate = true
  }
}

export const UNICODE_ATLAS_COLS = ATLAS_COLS
export const UNICODE_SLOT_SIZE = SLOT_SIZE
export const UNICODE_ATLAS_SIZE = ATLAS_SIZE
