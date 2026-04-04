import { damp } from 'maath/easing'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

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
  lfocusx?: number
  lfocusy?: number
  focussmooth?: number
  [key: string]: unknown
}

export const FOCUS_ANIM_RATE = 0.05
export const FOCUS_GLIDE_RATE = 1.5
export const FOCUS_GLIDE_DECAY = 0.17

const ANIMRATE = FOCUS_ANIM_RATE

export function initfocusifneeded(
  userData: FocusUserData,
  control: LayerControl,
  currentboard: unknown,
  options?: { withfacing?: boolean; smoothing?: boolean },
): boolean {
  if (!ispresent(userData.focusx)) {
    userData.focusx = control.focusx
    userData.focusy = control.focusy
    userData.tfocusx = control.focusx
    userData.tfocusy = control.focusy
    userData.currentboard = currentboard
    if (options?.smoothing) {
      userData.lfocusx = control.focusx
      userData.lfocusy = control.focusy
      userData.focussmooth = FOCUS_ANIM_RATE
    }
    if (options?.withfacing && control.facing !== undefined) {
      userData.facing = control.facing
    }
    return true
  }
  return false
}

/** Board change uses control delta vs last frame; pass `lfocusforboard` when something else (e.g. fpv sway) mutates `lfocus` mid-frame before this runs. Returns whether this frame started a board transition. */
export function stepfocuswithboardtransition(
  userData: FocusUserData,
  control: LayerControl,
  currentboard: unknown,
  tfocusx: number,
  tfocusy: number,
  delta: number,
  lfocusforboard?: { x: number; y: number },
): boolean {
  // init values if needed
  if (!ispresent(userData.lfocusx) || !ispresent(userData.lfocusy)) {
    userData.lfocusx = control.focusx
    userData.lfocusy = control.focusy
  }
  if (!ispresent(userData.focussmooth)) {
    userData.focussmooth = FOCUS_ANIM_RATE
  }

  // track target focus
  userData.tfocusx = tfocusx
  userData.tfocusy = tfocusy

  // board transition
  if (currentboard !== userData.currentboard) {
    const lx = lfocusforboard?.x ?? userData.lfocusx
    const ly = lfocusforboard?.y ?? userData.lfocusy
    const dx = control.focusx - lx
    const dy = control.focusy - ly
    userData.focusx = (userData.focusx ?? 0) + Math.sign(dx) * BOARD_WIDTH
    userData.focusy = (userData.focusy ?? 0) + Math.sign(dy) * BOARD_HEIGHT
    userData.currentboard = currentboard
    userData.focussmooth = FOCUS_GLIDE_RATE
    userData.lfocusx = control.focusx
    userData.lfocusy = control.focusy
    return true
  }

  // the glide
  const focussmooth = userData.focussmooth ?? FOCUS_ANIM_RATE
  damp(userData, 'focusx', tfocusx, focussmooth, delta)
  damp(userData, 'focusy', tfocusy, focussmooth, delta)
  damp(userData, 'focussmooth', FOCUS_ANIM_RATE, FOCUS_GLIDE_DECAY, delta)

  // track last focus for board transition
  userData.lfocusx = control.focusx
  userData.lfocusy = control.focusy
  return false
}

export function dampfocus(
  userData: FocusUserData,
  control: LayerControl,
  animrate: number = ANIMRATE,
  delta?: number,
): void {
  damp(userData, 'focusx', control.focusx, animrate, delta ?? 0.01)
  damp(userData, 'focusy', control.focusy, animrate, delta ?? 0.01)
}
