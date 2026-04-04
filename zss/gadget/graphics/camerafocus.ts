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
): boolean {
  if (!ispresent(userData.focusx)) {
    userData.focusx = control.focusx
    userData.focusy = control.focusy
    userData.tfocusx = control.focusx
    userData.tfocusy = control.focusy
    userData.lfocusx = control.focusx
    userData.lfocusy = control.focusy
    userData.facing = control.facing
    userData.currentboard = currentboard
    userData.focussmooth = FOCUS_ANIM_RATE
    return true
  }
  return false
}

/** Board change uses control delta vs last frame; pass `lfocusforboard` when something else (e.g. fpv sway) mutates `lfocus` mid-frame before this runs. Returns whether this frame started a board transition. */
export function stepfocuswithboardtransition(
  userdata: FocusUserData,
  control: LayerControl,
  currentboard: unknown,
  tfocusx: number,
  tfocusy: number,
  delta: number,
): boolean {
  // init values if needed
  if (!ispresent(userdata.lfocusx) || !ispresent(userdata.lfocusy)) {
    userdata.lfocusx = control.focusx
    userdata.lfocusy = control.focusy
  }
  if (!ispresent(userdata.focussmooth)) {
    userdata.focussmooth = FOCUS_ANIM_RATE
  }

  // track target focus
  userdata.tfocusx = tfocusx
  userdata.tfocusy = tfocusy

  // board transition
  if (currentboard !== userdata.currentboard) {
    const dx = control.focusx - userdata.lfocusx
    const dy = control.focusy - userdata.lfocusy
    userdata.focusx = (userdata.focusx ?? 0) + Math.sign(dx) * BOARD_WIDTH
    userdata.focusy = (userdata.focusy ?? 0) + Math.sign(dy) * BOARD_HEIGHT
    userdata.currentboard = currentboard
    userdata.focussmooth = FOCUS_GLIDE_RATE
    userdata.lfocusx = control.focusx
    userdata.lfocusy = control.focusy
    return true
  }

  // the glide
  const focussmooth = userdata.focussmooth ?? FOCUS_ANIM_RATE
  damp(userdata, 'focusx', tfocusx, focussmooth, delta)
  damp(userdata, 'focusy', tfocusy, focussmooth, delta)
  damp(userdata, 'focussmooth', FOCUS_ANIM_RATE, FOCUS_GLIDE_DECAY, delta)

  // track last focus for board transition
  userdata.lfocusx = control.focusx
  userdata.lfocusy = control.focusy
  return false
}

export function dampfocus(
  userdata: FocusUserData,
  control: LayerControl,
  animrate: number = ANIMRATE,
  delta?: number,
): void {
  damp(userdata, 'focusx', control.focusx, animrate, delta ?? 0.01)
  damp(userdata, 'focusy', control.focusy, animrate, delta ?? 0.01)
}
