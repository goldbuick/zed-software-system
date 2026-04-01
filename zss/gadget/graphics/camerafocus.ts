import { damp } from 'maath/easing'
import { ispresent } from 'zss/mapping/types'

export type LayerControl = {
  focusx: number
  focusy: number
  facing?: number
}

export type FocusUserData = {
  focusx?: number
  focusy?: number
  tfocusx?: number
  tfocusy?: number
  currentboard?: unknown
  facing?: number
  [key: string]: unknown
}

const ANIMRATE = 0.05

export function initfocusifneeded(
  userData: FocusUserData,
  control: LayerControl,
  currentboard: unknown,
  options?: { withfacing?: boolean },
): boolean {
  if (!ispresent(userData.focusx)) {
    userData.focusx = control.focusx
    userData.focusy = control.focusy
    userData.tfocusx = control.focusx
    userData.tfocusy = control.focusy
    userData.currentboard = currentboard
    if (options?.withfacing && control.facing !== undefined) {
      userData.facing = control.facing
    }
    return true
  }
  return false
}

export function dampfocus(
  userData: FocusUserData,
  control: LayerControl,
  animrate: number = ANIMRATE,
): void {
  damp(userData, 'focusx', control.focusx, animrate)
  damp(userData, 'focusy', control.focusy, animrate)
}
