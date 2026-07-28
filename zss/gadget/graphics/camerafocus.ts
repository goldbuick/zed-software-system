import { damp } from 'maath/easing'
import { debugingest } from 'zss/debugingest'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type LayerControl = {
  focusx: number
  focusy: number
  facing?: number
}

export type FocusUserData = {
  facing?: number
  focusx?: number
  focusy?: number
  tfocusx?: number
  tfocusy?: number
  lfocusx?: number
  lfocusy?: number
  focussmooth?: number
  currentboard?: string
  [key: string]: unknown
}

export const FOCUS_ANIM_RATE = 0.05
export const FOCUS_GLIDE_RATE = 1.5
export const FOCUS_GLIDE_DECAY = 0.17

const ANIMRATE = FOCUS_ANIM_RATE

export type ViewSizePrev = { w: number; h: number }

/** Updates prev and returns true when view width/height changed (including first sample). */
export function takeviewsizechange(
  prev: ViewSizePrev,
  viewwidth: number,
  viewheight: number,
): boolean {
  const changed = prev.w !== viewwidth || prev.h !== viewheight
  prev.w = viewwidth
  prev.h = viewheight
  return changed
}

/** Snap damped focus to clamp targets after a view size change. */
export function snapfocustotarget(
  userdata: FocusUserData,
  tfocusx: number,
  tfocusy: number,
): void {
  userdata.focusx = tfocusx
  userdata.focusy = tfocusy
  userdata.tfocusx = tfocusx
  userdata.tfocusy = tfocusy
}

export function initfocusifneeded(
  userData: FocusUserData,
  control: LayerControl,
  currentboard: string,
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
  currentboard: string,
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

  // board transition: edge cross offsets focus by one board then glides
  if (currentboard !== userdata.currentboard) {
    const prevboard = userdata.currentboard
    userdata.currentboard = currentboard
    const dx = control.focusx - (userdata.lfocusx ?? 0)
    const dy = control.focusy - (userdata.lfocusy ?? 0)
    const shouldsnap =
      (dx === 0 && Math.abs(dy) === BOARD_HEIGHT - 1) ||
      (Math.abs(dx) === BOARD_WIDTH - 1 && dy === 0)
    debugingest(
      'camerafocus.ts:stepfocuswithboardtransition',
      'camera board transition',
      {
        prevboard: prevboard ?? '',
        currentboard,
        dx,
        dy,
        shouldsnap,
        controlx: control.focusx,
        controly: control.focusy,
        lfocusx: userdata.lfocusx ?? -1,
        lfocusy: userdata.lfocusy ?? -1,
        tfocusx,
        tfocusy,
      },
      'BC2',
    )
    if (shouldsnap) {
      userdata.lfocusx = control.focusx
      userdata.lfocusy = control.focusy
      userdata.focussmooth = FOCUS_GLIDE_RATE
      userdata.focusx = (userdata.focusx ?? 0) + Math.sign(dx) * BOARD_WIDTH
      userdata.focusy = (userdata.focusy ?? 0) + Math.sign(dy) * BOARD_HEIGHT
      return true
    }
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
