import { VIEWSCALE } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'

export const MODE7_Z_NEAR = -128
export const MODE7_Z_MID = 128
export const MODE7_Z_FAR = 512

/** Effective uniform scale for focus clamping while camera Z eases between mode7 zoom stops. */
export function mode7viewscalefromcameraz(z: number) {
  const zc = clamp(z, MODE7_Z_NEAR, MODE7_Z_FAR)
  if (zc <= MODE7_Z_MID) {
    const t = (zc - MODE7_Z_NEAR) / (MODE7_Z_MID - MODE7_Z_NEAR)
    return VIEWSCALE.NEAR + t * (VIEWSCALE.MID - VIEWSCALE.NEAR)
  }
  const t = (zc - MODE7_Z_MID) / (MODE7_Z_FAR - MODE7_Z_MID)
  return VIEWSCALE.MID + t * (VIEWSCALE.FAR - VIEWSCALE.MID)
}
