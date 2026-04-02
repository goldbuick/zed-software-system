import { RUNTIME } from 'zss/config'
import type { LAYER } from 'zss/gadget/data/types'
import { LAYER_TYPE } from 'zss/gadget/data/types'

export type LayerZVariant = 'flat' | 'iso' | 'mode7' | 'fpv'

export function maptolayerz(layer: LAYER, variant: LayerZVariant): number {
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  switch (layer.type) {
    case LAYER_TYPE.TILES:
      return 0
    case LAYER_TYPE.DITHER:
      return variant === 'iso' ? drawheight : drawheight + 1
    case LAYER_TYPE.SPRITES:
      return variant === 'iso' ? drawheight * 0.75 : drawheight * 0.5
  }
  return 0
}

/** Max sprite layer Z for stacked SPRITES layers; fallback matches `maptolayerz` default for sprites. */
export function maxspriteslayerz(
  layers: LAYER[],
  variant: 'flat' | 'iso' | 'mode7' | 'fpv',
): number {
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  let maxz = -Infinity
  for (const layer of layers) {
    if (layer.type === LAYER_TYPE.SPRITES) {
      maxz = Math.max(maxz, maptolayerz(layer, variant))
    }
  }
  if (maxz === -Infinity) {
    return variant === 'iso' ? drawheight * 0.75 : drawheight * 0.5
  }
  return maxz
}
