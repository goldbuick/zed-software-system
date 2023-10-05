import { Color } from 'three'

import { range } from '/zss/mapping/array'

import { BYTES_PER_COLOR, PALETTE_BITMAP } from './types'

export function convertPaletteToColors(
  palette: PALETTE_BITMAP | undefined,
): Color[] {
  if (!palette) {
    return []
  }
  return range(15).map((i) => {
    const offset = i * BYTES_PER_COLOR
    return new Color(
      palette.bitmap.bits[offset] / 63.0,
      palette.bitmap.bits[offset + 1] / 63.0,
      palette.bitmap.bits[offset + 2] / 63.0,
    )
  })
}
