import type { Group } from 'three'
import { PerspectiveCamera } from 'three'

import { projectedtargetfocusfromcorners } from './projectedtargetfocusfromcorners'

export const MODE7_NDC_EDGE_SLACK = 0.055
export const MODE7_LETTERBOX_SPAN_MARGIN = 0.14

export type Mode7ProjectedTargetFocusInput = {
  camera: PerspectiveCamera
  corner: Group
  viewwidth: number
  viewheight: number
  drawwidth: number
  drawheight: number
  boardwidth: number
  boardheight: number
  controlfocusx: number
  controlfocusy: number
  viewscale: number
  edgeslack?: number
  letterboxmargin?: number
}

export function mode7projectedtargetfocus(
  input: Mode7ProjectedTargetFocusInput,
): { tfocusx: number; tfocusy: number } {
  return projectedtargetfocusfromcorners({
    ...input,
    edgeslack: input.edgeslack ?? MODE7_NDC_EDGE_SLACK,
    letterboxmargin: input.letterboxmargin ?? MODE7_LETTERBOX_SPAN_MARGIN,
  })
}
