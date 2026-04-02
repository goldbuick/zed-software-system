import type { Group } from 'three'
import { OrthographicCamera } from 'three'
import { projectedtargetfocusfromcorners } from 'zss/gadget/graphics/projectedtargetfocusfromcorners'

/** Wider admissible NDC inset than default so feasibility search succeeds under iso portal offset + tilt. */
export const ISO_NDC_EDGE_SLACK = 0.02

export type IsoProjectedTargetFocusInput = {
  camera: OrthographicCamera
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
  /** Override default `ISO_NDC_EDGE_SLACK` when tuning containment. */
  edgeslack?: number
}

export function isoprojectedtargetfocus(input: IsoProjectedTargetFocusInput): {
  tfocusx: number
  tfocusy: number
} {
  return projectedtargetfocusfromcorners({
    ...input,
    edgeslack: input.edgeslack ?? ISO_NDC_EDGE_SLACK,
  })
}
