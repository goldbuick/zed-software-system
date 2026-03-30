import { range } from 'zss/mapping/array'

import { BITMAP } from './bitmap'
import { FILE_BYTES_PER_COLOR } from './types'

/** Linear RGB components in 0–1 (same convention as Three.js `Color`). */
export type PALETTE_RGB = { r: number; g: number; b: number }

export function convertpalettetocolors(
  palette: BITMAP | undefined,
  count = 16,
): PALETTE_RGB[] {
  if (!palette) {
    return []
  }
  return range(count - 1).map((i) => {
    const offset = i * FILE_BYTES_PER_COLOR
    return {
      r: palette.bits[offset] / 63.0,
      g: palette.bits[offset + 1] / 63.0,
      b: palette.bits[offset + 2] / 63.0,
    }
  })
}
