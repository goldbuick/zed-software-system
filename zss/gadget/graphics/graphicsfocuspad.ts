import { RUNTIME } from 'zss/config'
import { VIEWSCALE } from 'zss/gadget/data/types'

export type GraphicsFocusMode = 'flat' | 'iso' | 'mode7'

export function graphicsfocuspad(mode: GraphicsFocusMode, zoom: number) {
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
            padleft: -42,
            padright: -42,
            padtop: 0,
            padbottom: 5 * RUNTIME.DRAW_CHAR_HEIGHT(),
          }
      }
      break
  }
}
