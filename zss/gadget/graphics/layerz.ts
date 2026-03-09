import { RUNTIME } from 'zss/config'
import type { LAYER } from 'zss/gadget/data/types'
import { LAYER_TYPE } from 'zss/gadget/data/types'

export type LayerZVariant = 'iso' | 'mode7' | 'fpv'

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
