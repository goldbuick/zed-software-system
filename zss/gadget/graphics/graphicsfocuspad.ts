import { VIEWSCALE } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type GraphicsFocusMode = 'flat' | 'iso' | 'mode7'

/**
 * Reference grid (cols × rows) used to calibrate pads against the previous
 * char-width / pixel literals: mode7 NDC factors match -10/-20 cw and 5/10 ch
 * margins at this size; iso uses the same NDC × halfw/halfh pattern for aspect
 * stability (derived from prior iso scalew/scaleh coefficients vs board halves).
 */

const BOARD_HWIDTH = BOARD_WIDTH * 0.5
const BOARD_HHEIGHT = BOARD_HEIGHT * 0.5

const MODE7_FAR_PAD_LEFT_NDC = -0.25 / BOARD_HWIDTH
const MODE7_FAR_PAD_TOP_NDC = -1.5 / BOARD_HHEIGHT
const MODE7_FAR_PAD_BOTTOM_NDC = -0.75 / BOARD_HHEIGHT

const MODE7_MID_PAD_LEFT_NDC = -8 / BOARD_HWIDTH
const MODE7_MID_PAD_TOP_NDC = -5 / BOARD_HHEIGHT
const MODE7_MID_PAD_BOTTOM_NDC = -1 / BOARD_HHEIGHT

const MODE7_NEAR_PAD_LEFT_NDC = -4 / BOARD_HWIDTH
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
      const z = zoom as VIEWSCALE
      switch (z) {
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
      const z = zoom as VIEWSCALE
      switch (z) {
        case VIEWSCALE.NEAR:
          return {
            padleft: MODE7_NEAR_PAD_LEFT_NDC * halfw,
            padright: MODE7_NEAR_PAD_LEFT_NDC * halfw,
            padtop: MODE7_NEAR_PAD_TOP_NDC * halfh,
            padbottom: MODE7_NEAR_PAD_BOTTOM_NDC * halfh,
          }
        default:
        case VIEWSCALE.MID:
          return {
            padleft: MODE7_MID_PAD_LEFT_NDC * halfw,
            padright: MODE7_MID_PAD_LEFT_NDC * halfw,
            padtop: MODE7_MID_PAD_TOP_NDC * halfh,
            padbottom: MODE7_MID_PAD_BOTTOM_NDC * halfh,
          }
        case VIEWSCALE.FAR:
          return {
            padleft: MODE7_FAR_PAD_LEFT_NDC * halfw,
            padright: MODE7_FAR_PAD_LEFT_NDC * halfw,
            padtop: MODE7_FAR_PAD_TOP_NDC * halfh,
            padbottom: MODE7_FAR_PAD_BOTTOM_NDC * halfh,
          }
      }
    }
  }
}
