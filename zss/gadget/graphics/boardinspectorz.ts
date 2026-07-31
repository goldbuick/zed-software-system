import { RUNTIME } from 'zss/config'
import type { LAYER } from 'zss/gadget/data/types'
import { type GRAPHICS_MODES, maptolayerz } from 'zss/gadget/graphics/layerz'

/** Padding above the highest board layer Z for flat ortho stacks (Z is draw order, not height). */
export const BOARD_INSPECTOR_Z_BUFFER = 200

/**
 * Padding above max layer Z for iso / mode7.
 * Those modes use Z as world height after tilt, so a large buffer floats overlays.
 */
export const BOARD_INSPECTOR_Z_CLEARANCE = 2

/**
 * FPV inspector Z: hug the floor between floor tiles (0) and wall pillars (0.5).
 * Max-layer stacking puts overlays at/above the ceiling, outside the corridor view.
 */
export const BOARD_INSPECTOR_Z_FPV = 0.25

/** Max Z for `layers` + `over` + optional exit-preview stacks (iso / mode7 / fpv). */
export function boardinspectorzfromgadgetstacks(
  variant: GRAPHICS_MODES,
  boardlayers: LAYER[],
  over: LAYER[],
  exitpreviewlayerlists: LAYER[][],
): number {
  if (variant === 'fpv') {
    return BOARD_INSPECTOR_Z_FPV
  }
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  let maxz = 0
  for (const layer of boardlayers) {
    maxz = Math.max(maxz, maptolayerz(layer, variant))
  }
  const overboost =
    variant === 'iso'
      ? drawheight + 1
      : variant === 'mode7'
        ? drawheight * 1.75
        : 0
  for (const layer of over) {
    maxz = Math.max(maxz, maptolayerz(layer, variant) + overboost)
  }
  for (const list of exitpreviewlayerlists) {
    for (const layer of list) {
      maxz = Math.max(maxz, maptolayerz(layer, variant))
    }
  }
  return maxz + BOARD_INSPECTOR_Z_CLEARANCE
}
