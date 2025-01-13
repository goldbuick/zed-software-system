import { createdevice } from 'zss/device'
import { api_error } from 'zss/device/api'

import { BITMAP, createbitmap } from '../gadget/data/bitmap'
import {
  CHARS_PER_ROW,
  CHAR_HEIGHT,
  CHAR_WIDTH,
  FILE_BYTES_PER_CHAR,
  FILE_BYTES_PER_COLOR,
} from '../gadget/data/types'

const filebytes = createdevice('file/bytes')

export function loadpalettefrombytes(bytes: Uint8Array): BITMAP | undefined {
  const count = Math.floor(bytes.length / FILE_BYTES_PER_COLOR)

  // data must be multiples of 3
  if (count * FILE_BYTES_PER_COLOR !== bytes.length) {
    api_error(filebytes, 'size', `wrong number of bytes for a palette`)
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

export function loadcharsetfrombytes(data: Uint8Array): BITMAP | undefined {
  const count = Math.floor(data.length / FILE_BYTES_PER_CHAR)

  // data must be multiples of 14
  if (count * FILE_BYTES_PER_CHAR !== data.length) {
    api_error(filebytes, 'size', `wrong number of bytes for a charset`)
    return undefined
  }

  const rows = Math.ceil(count / CHARS_PER_ROW)
  const rowWidth = CHAR_WIDTH * CHARS_PER_ROW
  const bitmap = createbitmap(rowWidth, CHAR_HEIGHT * rows)

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
