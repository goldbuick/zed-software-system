import { BITMAP, createbitmap } from 'zss/gadget/data/bitmap'
import {
  CHARS_PER_ROW,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  FILE_BYTES_PER_CHAR,
  FILE_BYTES_PER_COLOR,
} from 'zss/gadget/data/types'
import { MAYBE, ispresent } from 'zss/mapping/types'

export function loadpalettefrombytes(bytes: Uint8Array): MAYBE<BITMAP> {
  const count = Math.floor(bytes.length / FILE_BYTES_PER_COLOR)

  // data must be multiples of 3
  if (count * FILE_BYTES_PER_COLOR !== bytes.length) {
    return undefined
  }

  const bitmap = createbitmap(3, count)

  for (let i = 0; i < bitmap.bits.length; ++i) {
    bitmap.bits[i] = bytes[i]
  }

  return bitmap
}

function isBitOn(value: number, index: number) {
  return value & (1 << index) ? 255 : 0
}

export function loadcharsetfrombytes(bytes: Uint8Array): MAYBE<BITMAP> {
  const count = Math.floor(bytes.length / FILE_BYTES_PER_CHAR)

  // data must be multiples of 14
  if (count * FILE_BYTES_PER_CHAR !== bytes.length) {
    return undefined
  }

  const rows = Math.ceil(count / CHARS_PER_ROW)
  const rowWidth = CHAR_WIDTH * CHARS_PER_ROW
  const bitmap = createbitmap(rowWidth, CHAR_HEIGHT * rows)

  // unpack data so this is the only place bitmasking happens
  let cx = 0
  let cy = 0
  let ri = 0
  for (let i = 0; i < bytes.length; ++i) {
    const y = cy * CHAR_HEIGHT + ri

    const value = bytes[i]
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

export function writecharfrombytes(
  bytes: Uint8Array,
  charset: MAYBE<BITMAP>,
  idx: number,
) {
  if (!ispresent(charset)) {
    return undefined
  }
  // bytes should be 14 in length & charset must be multiples of 14
  const count = Math.floor(charset.bits.length / FILE_BYTES_PER_CHAR)
  if (
    idx < 0 ||
    idx > 255 ||
    bytes.length === FILE_BYTES_PER_CHAR ||
    count * FILE_BYTES_PER_CHAR !== charset.bits.length
  ) {
    return undefined
  }
  const rowwidth = CHAR_WIDTH * CHARS_PER_ROW
  const cx = (idx % CHARS_PER_ROW) * CHAR_WIDTH
  const cy = Math.floor(idx / CHARS_PER_ROW) * CHAR_HEIGHT
  const i = 0
  for (let y = 0; y < CHAR_HEIGHT; ++y) {
    for (let x = 0; x < CHAR_WIDTH; ++x) {
      const px = cx + x
      const py = cy + y
      charset.bits[px + py * rowwidth] = bytes[i] ? 255 : 0
    }
  }
}

export function readcharfrombytes(
  charset: MAYBE<BITMAP>,
  idx: number,
): Uint8Array {
  const bits: number[] = []
  if (!ispresent(charset)) {
    return Uint8Array.from(bits)
  }

  // bytes should be 14 in length & charset must be multiples of 14
  const count = Math.floor(charset.bits.length / FILE_BYTES_PER_CHAR)
  if (
    idx < 0 ||
    idx > 255 ||
    count * FILE_BYTES_PER_CHAR !== charset.bits.length
  ) {
    return Uint8Array.from(bits)
  }

  const rowwidth = CHAR_WIDTH * CHARS_PER_ROW
  const cx = (idx % CHARS_PER_ROW) * CHAR_WIDTH
  const cy = Math.floor(idx / CHARS_PER_ROW) * CHAR_HEIGHT
  for (let y = 0; y < CHAR_HEIGHT; ++y) {
    for (let x = 0; x < CHAR_WIDTH; ++x) {
      const px = cx + x
      const py = cy + y
      bits.push(charset.bits[px + py * rowwidth])
    }
  }

  return Uint8Array.from(bits)
}
