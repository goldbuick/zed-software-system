import { RUNTIME } from 'zss/config'
import { VIEWSCALE } from 'zss/gadget/data/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type GraphicsFocusMode = 'flat' | 'iso' | 'mode7'

/**
 * Reference grid (cols × rows) used to calibrate pads against the previous
 * char-width / pixel literals: mode7 NDC factors match -10/-20 cw and 5/10 ch
 * margins at this size; iso pixel pads scale from the same half-extents.
 */

/** mode7 MID: old pad / half-extent at ref → NDC (horizontal −10 cw, vertical ±5 ch). */
const MODE7_MID_PAD_LEFT_NDC = -8 / (BOARD_WIDTH * 0.5)
const MODE7_MID_PAD_TOP_NDC = -5 / (BOARD_HEIGHT * 0.5)
const MODE7_MID_PAD_BOTTOM_NDC = -1 / (BOARD_HEIGHT * 0.5)

/** mode7 NEAR: −20 cw / ±10 ch top, −5 ch bottom at ref. */
const MODE7_NEAR_PAD_LEFT_NDC = -4 / (BOARD_WIDTH * 0.5)
const MODE7_NEAR_PAD_TOP_NDC = 1 / (BOARD_HEIGHT * 0.5)
const MODE7_NEAR_PAD_BOTTOM_NDC = 1 / (BOARD_HEIGHT * 0.5)

export function graphicsfocuspad(
  mode: GraphicsFocusMode,
  zoom: number,
  viewwidth: number,
  viewheight: number,
) {
  const halfw = viewwidth * 0.5
  const halfh = viewheight * 0.5
  const drawcharwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawcharheight = RUNTIME.DRAW_CHAR_HEIGHT()
  const halfw_ref = BOARD_WIDTH * drawcharwidth * 0.5
  const halfh_ref = BOARD_HEIGHT * drawcharheight * 0.5
  const scalew = halfw_ref > 0 ? halfw / halfw_ref : 1
  const scaleh = halfh_ref > 0 ? halfh / halfh_ref : 1

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
        case VIEWSCALE.FAR:
          return {
            padleft: -1.0 * scalew,
            padright: -1.0 * scalew,
            padtop: 0,
            padbottom: -3.0 * scaleh,
          }
        case VIEWSCALE.NEAR:
          return {
            padleft: -0.25 * scalew,
            padright: -0.25 * scalew,
            padtop: 0,
            padbottom: -0.75 * scaleh,
          }
        default:
        case VIEWSCALE.MID:
          return {
            padleft: -0.5 * scalew,
            padright: -0.5 * scalew,
            padtop: 0,
            padbottom: -1.5 * scaleh,
          }
      }
    }
    case 'mode7': {
      const z = zoom as VIEWSCALE
      switch (z) {
        case VIEWSCALE.FAR:
          return {
            padleft: 0,
            padright: 0,
            padtop: 0,
            padbottom: 0,
          }
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
      }
    }
  }
}
