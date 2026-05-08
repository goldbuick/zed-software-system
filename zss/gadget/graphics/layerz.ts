import { RUNTIME } from 'zss/config'
import type { LAYER } from 'zss/gadget/data/types'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { NAME } from 'zss/words/types'

export type GRAPHICS_MODES = 'flat' | 'iso' | 'mode7' | 'fpv'

/** Fold arbitrary `@graphics` / board graphics strings onto the canonical layer-stack variants. */
export function normalizelayerzvariant(value: unknown): GRAPHICS_MODES {
  const key = NAME(value)
  switch (key) {
    case 'fpv':
    case 'iso':
    case 'mode7':
    case 'flat':
      return key
    default:
      return 'flat'
  }
}

export function maptolayerz(layer: LAYER, mode: GRAPHICS_MODES): number {
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  switch (layer.type) {
    case LAYER_TYPE.TILES:
      return 0
    case LAYER_TYPE.DITHER:
      return mode === 'iso' ? drawheight : drawheight + 1
    case LAYER_TYPE.SPRITES:
      return mode === 'iso' ? drawheight * 0.75 : drawheight * 0.5
  }
  return 0
}

/** Max sprite layer Z for stacked SPRITES layers; fallback matches `maptolayerz` default for sprites. */
export function maxspriteslayerz(
  layers: LAYER[],
  mode: GRAPHICS_MODES,
): number {
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  let maxz = -Infinity
  for (const layer of layers) {
    if (layer.type === LAYER_TYPE.SPRITES) {
      maxz = Math.max(maxz, maptolayerz(layer, mode))
    }
  }
  if (maxz === -Infinity) {
    return mode === 'iso' ? drawheight * 0.75 : drawheight * 0.5
  }
  return maxz
}
