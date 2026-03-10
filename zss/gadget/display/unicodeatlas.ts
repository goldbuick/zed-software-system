import TinySDF from '@mapbox/tiny-sdf'
import { DataTexture, RedFormat, UnsignedByteType } from 'three'
import { CHAR_HEIGHT } from 'zss/gadget/data/types'

const ATLAS_SIZE = 1024
const SLOT_SIZE = 64
const ATLAS_COLS = ATLAS_SIZE / SLOT_SIZE
const SLOT_PADDING = 2

type GlyphSlot = {
  slotx: number
  sloty: number
}

let tinysdf: InstanceType<typeof TinySDF> | null = null
const glyphcache = new Map<number, GlyphSlot>()
let atlastexture: DataTexture | null = null
const atlasdata = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE)
let nextslot = 0

function gettinysdf(): InstanceType<typeof TinySDF> {
  tinysdf ??= new TinySDF({
    fontSize: CHAR_HEIGHT,
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontStyle: 'normal',
    buffer: 3,
    radius: 8,
    cutoff: 0.25,
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
  const dstx = slotx * SLOT_SIZE + SLOT_PADDING
  const dsty = sloty * SLOT_SIZE + SLOT_PADDING
  const copyw = Math.min(glyph.width, SLOT_SIZE - SLOT_PADDING * 2)
  const copyh = Math.min(glyph.height, SLOT_SIZE - SLOT_PADDING * 2)
  for (let y = 0; y < copyh; y++) {
    for (let x = 0; x < copyw; x++) {
      const src = y * glyph.width + x
      const dst = (dsty + y) * ATLAS_SIZE + (dstx + x)
      atlasdata[dst] = glyph.data[src]
    }
  }
  glyphcache.set(codepoint, { slotx, sloty })
  if (atlastexture) {
    atlastexture.needsUpdate = true
  }
  return { slotx, sloty }
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
    atlastexture.needsUpdate = true
  }
  return atlastexture
}

export function lookupglyph(codepoint: number): GlyphSlot | null {
  return ensureglyph(codepoint)
}

export function invalidateatlas(): void {
  if (atlastexture) {
    atlastexture.needsUpdate = true
  }
}

export const UNICODE_ATLAS_COLS = ATLAS_COLS
export const UNICODE_SLOT_SIZE = SLOT_SIZE
export const UNICODE_ATLAS_SIZE = ATLAS_SIZE
