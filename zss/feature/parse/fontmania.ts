/**
 * REXXCOM Font Mania 2.x DOS .COM font installer layout.
 * Glyphs are raw EGA 8xh packed bits (same as ZZT .chr).
 */
import { FILE_BYTES_PER_CHAR } from 'zss/gadget/data/types'
import { MAYBE } from 'zss/mapping/types'

const FONT_MANIA_MARK = 'FONT MANIA'
const GLYPH_COUNT = 256
const REQUIRED_HEIGHT = FILE_BYTES_PER_CHAR

function readu16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

export function isfontmaniacom(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || bytes[0] !== 0xeb) {
    return false
  }
  const head = String.fromCharCode(...bytes.subarray(0, 80))
  return head.toUpperCase().includes(FONT_MANIA_MARK)
}

/**
 * Extract 256 * 14 glyph bytes from a Font Mania COM.
 * Height must be 14 (ZSS cell). Returns undefined if not Font Mania or bad layout.
 */
export function extractfontmaniaglyphs(bytes: Uint8Array): MAYBE<Uint8Array> {
  if (!isfontmaniacom(bytes)) {
    return undefined
  }
  const offset = readu16le(bytes, 2)
  const height = bytes[5]
  if (height !== REQUIRED_HEIGHT) {
    return undefined
  }
  const end = offset + GLYPH_COUNT * height
  if (offset < 0 || end > bytes.length) {
    return undefined
  }
  return bytes.subarray(offset, end)
}

/** Raw .chr or Font Mania COM → glyph bytes for loadcharsetfrombytes. */
export function resolvecharsetbytes(bytes: Uint8Array): MAYBE<Uint8Array> {
  if (isfontmaniacom(bytes)) {
    return extractfontmaniaglyphs(bytes)
  }
  if (bytes.length > 0 && bytes.length % FILE_BYTES_PER_CHAR === 0) {
    return bytes
  }
  return undefined
}
