import { VIEWSCALE } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'

/**
 * Base inset in **cell** units (scaled by drawwidth / drawheight), before zoom.
 * Same shape as the original iso/mode7 focus pads.
 */
const BASE_PAD_X_CELLS = -1.0
const BASE_PAD_TOP_CELLS = 0
const BASE_PAD_BOTTOM_CELLS = -3.0

export type GraphicsFocusMode = 'flat' | 'iso' | 'mode7'

/** Per-mode multiplier on base pads (flat has no padding). */
function modemult(mode: GraphicsFocusMode) {
  switch (mode) {
    case 'flat':
      return 0
    case 'iso':
      return 1
    case 'mode7':
      return 1
  }
}

/**
 * Edge padding in **draw units** (pixels) for focus clamping. Flat uses none; iso/mode7
 * use fixed cell-based amounts scaled by zoom (VIEWSCALE-like or ortho scale 1…3).
 */
export function graphicsfocuspad(
  mode: GraphicsFocusMode,
  drawwidth: number,
  drawheight: number,
  zoom: number,
) {
  if (mode === 'flat') {
    return {
      padleft: 0,
      padright: 0,
      padtop: 0,
      padbottom: 0,
    }
  }
  const z = clamp(zoom, VIEWSCALE.FAR, VIEWSCALE.NEAR)
  const zoommult = z / VIEWSCALE.MID
  const m = modemult(mode)
  const padx = drawwidth * BASE_PAD_X_CELLS * zoommult * m
  const padtop = drawheight * BASE_PAD_TOP_CELLS * zoommult * m
  const padbottom = drawheight * BASE_PAD_BOTTOM_CELLS * zoommult * m
  return {
    padleft: padx,
    padright: padx,
    padtop,
    padbottom,
  }
}
