import { RUNTIME } from 'zss/config'
import type { LAYER } from 'zss/gadget/data/types'
import { type LayerZVariant, maptolayerz } from 'zss/gadget/graphics/layerz'

/** Padding above the highest board layer Z inside the RenderTexture portal. */
export const BOARD_INSPECTOR_Z_BUFFER = 200

/** Max Z for `layers` + `over` + optional exit-preview stacks (iso / mode7 / fpv). */
export function boardinspectorzfromgadgetstacks(
  variant: LayerZVariant,
  boardlayers: LAYER[],
  over: LAYER[],
  exitpreviewlayerlists: LAYER[][],
): number {
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  let maxz = 0
  for (const layer of boardlayers) {
    maxz = Math.max(maxz, maptolayerz(layer, variant))
  }
  const overboost =
    variant === 'iso' || variant === 'fpv'
      ? drawheight + 1
      : variant === 'mode7'
        ? drawheight * 1.125
        : 0
  for (const layer of over) {
    maxz = Math.max(maxz, maptolayerz(layer, variant) + overboost)
  }
  for (const list of exitpreviewlayerlists) {
    for (const layer of list) {
      maxz = Math.max(maxz, maptolayerz(layer, variant))
    }
  }
  return maxz + BOARD_INSPECTOR_Z_BUFFER
}
