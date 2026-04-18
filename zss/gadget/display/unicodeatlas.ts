import TinySDF from '@mapbox/tiny-sdf'
import { DataTexture, LinearFilter, RedFormat, UnsignedByteType } from 'three'

/** Slot edge length in texels (glyph + padding + SDF halo). */
const SLOT_SIZE = 48
const ATLAS_COLS = 32
const ATLAS_SIZE = ATLAS_COLS * SLOT_SIZE
const SLOT_PADDING = 1

/** SDF spread in texels (wider ramp than radius=2 for small on-screen cells). */
const SDF_RADIUS = 6
const SDF_BUFFER = 3
const SDF_CUTOFF = 0.5

/** Default stack so overlay weight matches bold-ish 8×14 bitmap tiles. */
export const UNICODE_OVERLAY_FONT_FAMILY =
  'ui-monospace, "SF Mono", "JetBrains Mono", "IBM Plex Mono", "Noto Sans Mono", monospace'
export const UNICODE_OVERLAY_FONT_WEIGHT = '500'

const MAX_FONT_FIT =
  SLOT_SIZE - 2 * SLOT_PADDING - 2 * SDF_RADIUS - 2 * SDF_BUFFER

function computedfontsize(hint: number): number {
  const tier = Math.min(2, Math.max(0.5, hint))
  return Math.min(MAX_FONT_FIT, Math.round(MAX_FONT_FIT * (0.75 + 0.25 * tier)))
}

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

let lastFontSizeBucket = computedfontsize(1)
let atlasfullwarned = false

function resetunicodeatlascore(): void {
  glyphcache.clear()
  nextslot = 0
  atlasdata.fill(0)
  tinysdf = null
  if (atlastexture) {
    atlastexture.dispose()
    atlastexture = null
  }
}

/**
 * Call from `UnicodeOverlay` when DPR / GPU tier scale changes so cached SDFs
 * match the current raster budget. Returns whether the atlas was reset (new
 * texture instance — refresh `uniforms.atlas` on the overlay material).
 */
export function setunicodeatlasrasterhint(hint: number): boolean {
  const clamped = Math.min(2, Math.max(0.5, hint))
  const nextFs = computedfontsize(clamped)
  if (nextFs === lastFontSizeBucket && tinysdf !== null) {
    return false
  }
  lastFontSizeBucket = nextFs
  resetunicodeatlascore()
  return true
}

function gettinysdf(): InstanceType<typeof TinySDF> {
  tinysdf ??= new TinySDF({
    fontSize: lastFontSizeBucket,
    radius: SDF_RADIUS,
    buffer: SDF_BUFFER,
    cutoff: SDF_CUTOFF,
    fontWeight: UNICODE_OVERLAY_FONT_WEIGHT,
    fontFamily: UNICODE_OVERLAY_FONT_FAMILY,
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
  if (nextslot >= ATLAS_COLS * ATLAS_COLS) {
    if (!atlasfullwarned && import.meta?.env.DEV) {
      atlasfullwarned = true

      console.warn(
        '[unicodeatlas] atlas full (1024 slots); further code points will not render',
      )
    }
    return null
  }
  const slotx = nextslot % ATLAS_COLS
  const sloty = Math.floor(nextslot / ATLAS_COLS)
  nextslot++
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
      RedFormat,
      UnsignedByteType,
    )
    atlastexture.minFilter = LinearFilter
    atlastexture.magFilter = LinearFilter
    atlastexture.generateMipmaps = false
    atlastexture.flipY = false
    atlastexture.unpackAlignment = 1
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
/** SDF edge threshold in atlas value space (0..1); matches `SDF_CUTOFF`. */
export const UNICODE_SDF_EDGE = SDF_CUTOFF
