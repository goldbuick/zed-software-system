import { Color } from 'three'
import { range } from 'zss/mapping/array'

import { BITMAP } from './bitmap'
import { BYTES_PER_COLOR } from './types'

export function convertPaletteToColors(
  palette: BITMAP | undefined,
  count = 16,
): Color[] {
  if (!palette) {
    return []
  }
  return range(count - 1).map((i) => {
    const offset = i * BYTES_PER_COLOR
    return new Color(
      palette.bits[offset] / 63.0,
      palette.bits[offset + 1] / 63.0,
      palette.bits[offset + 2] / 63.0,
    )
  })
}
