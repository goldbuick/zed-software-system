import DEFAULT_CHR from 'data-url:./default.chr'
import DEFAULT_PAL from 'data-url:./default.pal'

import { BITMAP, createBitmap } from '../data/bitmap'
import {
  BYTES_PER_COLOR,
  CHARS_PER_ROW,
  CHAR_HEIGHT,
  CHAR_WIDTH,
} from '../data/types'

// export function loadCharsetFrom
function base64ToBytes(base64: string) {
  try {
    const binString = atob(base64)
    // @ts-expect-error don't care
    return Uint8Array.from(binString, (m) => m.codePointAt(0))
  } catch (err) {
    console.error(err)
  }
  return new Uint8Array([])
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64] = dataUrl.split(',')
  if (!base64) {
    return new Uint8Array([])
  }
  return base64ToBytes(decodeURIComponent(base64))
}

export function loadPaletteFromBytes(bytes: Uint8Array): BITMAP | undefined {
  const count = Math.floor(bytes.length / BYTES_PER_COLOR)

  // data must be multiples of 3
  if (count * BYTES_PER_COLOR !== bytes.length) {
    return undefined
  }

  const bitmap = createBitmap(3, count)

  for (let i = 0; i < bitmap.bits.length; ++i) {
    bitmap.bits[i] = bytes[i]
  }

  return bitmap
}

const defaultpalette = loadPaletteFromBytes(dataUrlToBytes(DEFAULT_PAL))
export function loadDefaultPalette() {
  return defaultpalette
}

const FILE_BYTES_PER_CHAR = 14

function isBitOn(value: number, index: number) {
  return Boolean(value & (1 << index)) ? 255 : 0
}

export function loadCharsetFromBytes(data: Uint8Array): BITMAP | undefined {
  const count = Math.floor(data.length / FILE_BYTES_PER_CHAR)

  // data must be multiples of 14
  if (count * FILE_BYTES_PER_CHAR !== data.length) {
    return undefined
  }

  const rows = Math.ceil(count / CHARS_PER_ROW)
  const rowWidth = CHAR_WIDTH * CHARS_PER_ROW
  const bitmap = createBitmap(rowWidth, CHAR_HEIGHT * rows)

  // unpack data so this is the only place bitmasking happens
  let cx = 0
  let cy = 0
  let ri = 0
  for (let i = 0; i < data.length; ++i) {
    const y = cy * CHAR_HEIGHT + ri

    const value = data[i]
    for (let b = 0; b < CHAR_WIDTH; ++b) {
      const x = cx * CHAR_WIDTH + b
      bitmap.bits[x + y * rowWidth] = isBitOn(value, 7 - b)
    }

    ++ri
    if (ri === CHAR_HEIGHT) {
      ri = 0
      ++cx
      if (cx === CHARS_PER_ROW) {
        cx = 0
        ++cy
      }
    }
  }

  return bitmap
}

const defaultcharset = loadCharsetFromBytes(dataUrlToBytes(DEFAULT_CHR))
export function loadDefaultCharset() {
  return defaultcharset
}
