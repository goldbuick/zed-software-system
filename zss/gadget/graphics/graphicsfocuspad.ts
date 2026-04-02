import { VIEWSCALE } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type GraphicsFocusMode = 'flat' | 'iso' | 'mode7'

/**
 * Reference grid (cols × rows): ISO/MODE7 constants are **per-axis** NDC contributions
 * (after `padstondc`: `padleft / (viewwidth/2)` etc.). Horizontal pads scale with
 * `viewwidth`, vertical with `viewheight`, so **aspect ratio** is reflected in **pixel**
 * pads; `isoprojectedtargetfocus` / `mode7projectedtargetfocus` also snap the camera
 * frustum to `viewwidth`×`viewheight` so `project()` matches those NDC margins.
 *
 * Mode7 uses independent horizontal left/right factors—perspective + X tilt skews the
 * board quad in NDC (mirrors iso’s asymmetric ISO_*_PAD_LEFT / RIGHT).
 */

const BOARD_HWIDTH = BOARD_WIDTH * 0.5
const BOARD_HHEIGHT = BOARD_HEIGHT * 0.5

const MODE7_FAR_PAD_LEFT_NDC = 0 / BOARD_HWIDTH
const MODE7_FAR_PAD_RIGHT_NDC = 0 / BOARD_HWIDTH
const MODE7_FAR_PAD_TOP_NDC = 0 / BOARD_HHEIGHT
const MODE7_FAR_PAD_BOTTOM_NDC = 0 / BOARD_HHEIGHT

const MODE7_MID_PAD_LEFT_NDC = -8 / BOARD_HWIDTH
const MODE7_MID_PAD_RIGHT_NDC = 6 / BOARD_HWIDTH
const MODE7_MID_PAD_TOP_NDC = -5 / BOARD_HHEIGHT
const MODE7_MID_PAD_BOTTOM_NDC = -1 / BOARD_HHEIGHT

const MODE7_NEAR_PAD_LEFT_NDC = 1 / BOARD_HWIDTH
const MODE7_NEAR_PAD_RIGHT_NDC = 1 / BOARD_HWIDTH
const MODE7_NEAR_PAD_TOP_NDC = 1 / BOARD_HHEIGHT
const MODE7_NEAR_PAD_BOTTOM_NDC = 1 / BOARD_HHEIGHT

const ISO_FAR_PAD_LEFT_NDC = 3 / BOARD_HWIDTH
const ISO_FAR_PAD_RIGHT_NDC = 3 / BOARD_HWIDTH
const ISO_FAR_PAD_TOP_NDC = 0 / BOARD_HHEIGHT
const ISO_FAR_PAD_BOTTOM_NDC = -3 / BOARD_HHEIGHT

const ISO_MID_PAD_LEFT_NDC = 5 / BOARD_HWIDTH
const ISO_MID_PAD_RIGHT_NDC = -5 / BOARD_HWIDTH
const ISO_MID_PAD_TOP_NDC = -6 / BOARD_HHEIGHT
const ISO_MID_PAD_BOTTOM_NDC = -3 / BOARD_HHEIGHT

const ISO_NEAR_PAD_LEFT_NDC = 6 / BOARD_HWIDTH
const ISO_NEAR_PAD_RIGHT_NDC = -6 / BOARD_HWIDTH
const ISO_NEAR_PAD_TOP_NDC = -6 / BOARD_HHEIGHT
const ISO_NEAR_PAD_BOTTOM_NDC = -6 / BOARD_HHEIGHT

export function graphicsfocuspad(
  mode: GraphicsFocusMode,
  zoom: number,
  viewwidth: number,
  viewheight: number,
) {
  const halfw = viewwidth * 0.5
  const halfh = viewheight * 0.5
  switch (mode) {
    default:
    case 'flat':
      return {
        padleft: 0,
        padright: 0,
        padtop: 0,
        padbottom: 0,
      }
    case 'iso': {
      switch (zoom as VIEWSCALE) {
        case VIEWSCALE.NEAR:
          return {
            padleft: ISO_NEAR_PAD_LEFT_NDC * halfw,
            padright: ISO_NEAR_PAD_RIGHT_NDC * halfw,
            padtop: ISO_NEAR_PAD_TOP_NDC * halfh,
            padbottom: ISO_NEAR_PAD_BOTTOM_NDC * halfh,
          }
        default:
        case VIEWSCALE.MID:
          return {
            padleft: ISO_MID_PAD_LEFT_NDC * halfw,
            padright: ISO_MID_PAD_RIGHT_NDC * halfw,
            padtop: ISO_MID_PAD_TOP_NDC * halfh,
            padbottom: ISO_MID_PAD_BOTTOM_NDC * halfh,
          }
        case VIEWSCALE.FAR:
          return {
            padleft: ISO_FAR_PAD_LEFT_NDC * halfw,
            padright: ISO_FAR_PAD_RIGHT_NDC * halfw,
            padtop: ISO_FAR_PAD_TOP_NDC * halfh,
            padbottom: ISO_FAR_PAD_BOTTOM_NDC * halfh,
          }
      }
    }
    case 'mode7': {
      switch (zoom as VIEWSCALE) {
        case VIEWSCALE.NEAR:
          return {
            padleft: MODE7_NEAR_PAD_LEFT_NDC * halfw,
            padright: MODE7_NEAR_PAD_RIGHT_NDC * halfw,
            padtop: MODE7_NEAR_PAD_TOP_NDC * halfh,
            padbottom: MODE7_NEAR_PAD_BOTTOM_NDC * halfh,
          }
        default:
        case VIEWSCALE.MID:
          return {
            padleft: MODE7_MID_PAD_LEFT_NDC * halfw,
            padright: MODE7_MID_PAD_RIGHT_NDC * halfw,
            padtop: MODE7_MID_PAD_TOP_NDC * halfh,
            padbottom: MODE7_MID_PAD_BOTTOM_NDC * halfh,
          }
        case VIEWSCALE.FAR:
          return {
            padleft: MODE7_FAR_PAD_LEFT_NDC * halfw,
            padright: MODE7_FAR_PAD_RIGHT_NDC * halfw,
            padtop: MODE7_FAR_PAD_TOP_NDC * halfh,
            padbottom: MODE7_FAR_PAD_BOTTOM_NDC * halfh,
          }
      }
    }
  }
}
