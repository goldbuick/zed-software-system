import { Color } from 'three'

import type { PALETTE_RGB } from './palette'

export function palettetothreecolors(rgb: PALETTE_RGB[]): Color[] {
  return rgb.map((c) => new Color(c.r, c.g, c.b))
}
