import { Color } from 'three'
import { range } from 'zss/mapping/array'

import { BITMAP } from './bitmap'
import { FILE_BYTES_PER_COLOR } from './types'

export function convertpalettetocolors(
  palette: BITMAP | undefined,
  count = 16,
): Color[] {
  if (!palette) {
    return []
  }
  return range(count - 1).map((i) => {
    const offset = i * FILE_BYTES_PER_COLOR
    return new Color(
      palette.bits[offset] / 63.0,
      palette.bits[offset + 1] / 63.0,
      palette.bits[offset + 2] / 63.0,
    )
  })
}
