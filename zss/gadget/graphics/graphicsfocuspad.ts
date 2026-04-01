import { RUNTIME } from 'zss/config'
import { VIEWSCALE } from 'zss/gadget/data/types'

export type GraphicsFocusMode = 'flat' | 'iso' | 'mode7'

export function graphicsfocuspad(mode: GraphicsFocusMode, zoom: number) {
  const drawcharwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawcharheight = RUNTIME.DRAW_CHAR_HEIGHT()
  switch (mode) {
    default:
    case 'flat':
      return {
        padleft: 0,
        padright: 0,
        padtop: 0,
        padbottom: 0,
      }
    case 'iso':
      switch (zoom as VIEWSCALE) {
        case VIEWSCALE.FAR:
          return {
            padleft: -1.0,
            padright: -1.0,
            padtop: 0,
            padbottom: -3.0,
          }
        case VIEWSCALE.MID:
          return {
            padleft: -0.5,
            padright: -0.5,
            padtop: 0,
            padbottom: -1.5,
          }
        case VIEWSCALE.NEAR:
          return {
            padleft: -0.25,
            padright: -0.25,
            padtop: 0,
            padbottom: -0.75,
          }
      }
      break
    case 'mode7':
      switch (zoom as VIEWSCALE) {
        case VIEWSCALE.FAR:
          return {
            padleft: 0 * drawcharwidth,
            padright: 0 * drawcharwidth,
            padtop: 0 * drawcharheight,
            padbottom: 0 * drawcharheight,
          }
        case VIEWSCALE.MID:
          return {
            padleft: 0 * drawcharwidth,
            padright: 0 * drawcharwidth,
            padtop: 4 * drawcharheight,
            padbottom: 4 * drawcharheight,
          }
        case VIEWSCALE.NEAR:
          return {
            padleft: -20 * drawcharwidth,
            padright: -20 * drawcharwidth,
            padtop: 10 * drawcharheight,
            padbottom: -5 * drawcharheight,
          }
      }
      break
  }
}
