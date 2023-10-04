import DEFAULT_CHR from 'data-url:./default.chr'
import DEFAULT_PAL from 'data-url:./default.pal'
import { nanoid } from 'nanoid'

import {
  BYTES_PER_CHAR,
  BYTES_PER_COLOR,
  CHARSET_BYTES,
  PALETTE_BYTES,
} from '../data'

// export function loadCharsetFrom
function base64ToBytes(base64: string) {
  try {
    const binString = atob(base64)
    return Uint8Array.from(binString, (m) => m.codePointAt(0))
  } catch (err) {
    console.error(err)
  }
  return ''
}

function dataUrlToBytes(dataUrl: string) {
  console.info({ dataUrl })
  const [, base64] = dataUrl.split(',')
  if (!base64) {
    return new Uint8Array([])
  }
  return base64ToBytes(decodeURIComponent(base64))
}

export function loadPaletteFromBytes(
  bytes: Uint8Array,
): PALETTE_BYTES | undefined {
  const count = Math.floor(bytes.length / BYTES_PER_COLOR)

  // data must be multiples of 3
  if (count * BYTES_PER_COLOR !== bytes.length) {
    return undefined
  }

  return {
    id: nanoid(),
    count,
    bytes,
  }
}

export function loadDefaultPalette() {
  return loadPaletteFromBytes(dataUrlToBytes(DEFAULT_PAL))
}

const FILE_BYTES_PER_CHAR = 14

function isBitOn(value: number, index: number) {
  return Boolean(value & (1 << index)) ? 1 : 0
}

export function loadCharsetFromBytes(
  data: Uint8Array,
): CHARSET_BYTES | undefined {
  const count = Math.floor(data.length / FILE_BYTES_PER_CHAR)

  // data must be multiples of 14
  if (count * FILE_BYTES_PER_CHAR !== data.length) {
    return undefined
  }

  const bytes = new Uint8Array(count * BYTES_PER_CHAR)

  // unpack data so this is the only place bitmasking happens
  let cursor = 0
  for (let i = 0; i < data.length; ++i) {
    const value = data[i]
    for (let b = 7; b >= 0; --b) {
      bytes[cursor++] = isBitOn(value, b)
    }
  }

  return {
    id: nanoid(),
    count,
    bytes,
  }
}

export function loadDefaultCharset() {
  return loadCharsetFromBytes(dataUrlToBytes(DEFAULT_CHR))
}
