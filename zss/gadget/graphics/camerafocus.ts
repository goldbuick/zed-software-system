import { damp } from 'maath/easing'
import { debugingest } from 'zss/debugingest'
import { ispresent } from 'zss/mapping/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type LayerControl = {
  focusx: number
  focusy: number
  facing?: number
}

export type GridBias = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

export type FocusExitSnap = {
  board: string
  exiteast: string
  exitwest: string
  exitnorth: string
  exitsouth: string
  exiteast2: string
  exitwest2: string
  exitnorth2: string
  exitsouth2: string
  exitne: string
  exitnw: string
  exitse: string
  exitsw: string
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
  gridbiasdx?: -1 | 0 | 1
  gridbiasdy?: -1 | 0 | 1
  panphase?: boolean
  pantargetx?: number
  pantargety?: number
  departureboard?: string
  exitsnap?: FocusExitSnap
  /** Focus remap + corner snap deferred until layout tears down the strip. */
  panrecenterpending?: boolean
  panrecenterbiasdx?: -1 | 0 | 1
  panrecenterbiasdy?: -1 | 0 | 1
  [key: string]: unknown
}

export const FOCUS_ANIM_RATE = 0.05
export const FOCUS_GLIDE_RATE = 1.5
export const FOCUS_GLIDE_DECAY = 0.17
/** Settle when focus is within this many cells of the pan target. */
export const FOCUS_PAN_SETTLE_CELLS = 0.35

const ANIMRATE = FOCUS_ANIM_RATE

export function readgridbias(userdata: FocusUserData): GridBias {
  const dx = userdata.gridbiasdx ?? 0
  const dy = userdata.gridbiasdy ?? 0
  return {
    dx: dx === -1 || dx === 1 ? dx : 0,
    dy: dy === -1 || dy === 1 ? dy : 0,
  }
}

export function isfocuspanphase(userdata: FocusUserData): boolean {
  return userdata.panphase === true
}

export function ispanrecenterpending(userdata: FocusUserData): boolean {
  return userdata.panrecenterpending === true
}

/**
 * Apply deferred settle remap (call from useLayoutEffect with strip teardown).
 * Returns the travel bias that was applied, or null when nothing was pending.
 * Callers should shift the corner group by +bias * BOARD * cell size (not hard
 * snap to the ideal corner) so residual damp lag is preserved optically.
 */
export function applypanrecenter(userdata: FocusUserData): GridBias | null {
  if (userdata.panrecenterpending !== true) {
    return null
  }
  const biasdx = userdata.panrecenterbiasdx ?? 0
  const biasdy = userdata.panrecenterbiasdy ?? 0
  const dx = biasdx === -1 || biasdx === 1 ? biasdx : 0
  const dy = biasdy === -1 || biasdy === 1 ? biasdy : 0
  userdata.focusx = (userdata.focusx ?? 0) - dx * BOARD_WIDTH
  userdata.focusy = (userdata.focusy ?? 0) - dy * BOARD_HEIGHT
  userdata.panrecenterpending = false
  userdata.panrecenterbiasdx = 0
  userdata.panrecenterbiasdy = 0
  return { dx, dy }
}

/** Shift corner by the board delta that matches applypanrecenter (keeps lag). */
export function shiftcornerforpanrecenter(
  corner: { x: number; y: number },
  bias: GridBias,
  drawwidth: number,
  drawheight: number,
): void {
  corner.x += bias.dx * BOARD_WIDTH * drawwidth
  corner.y += bias.dy * BOARD_HEIGHT * drawheight
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
    userData.gridbiasdx = 0
    userData.gridbiasdy = 0
    userData.panphase = false
    userData.panrecenterpending = false
    return true
  }
  return false
}

function isedgeexitdelta(dx: number, dy: number): boolean {
  return (
    (dx === 0 && Math.abs(dy) === BOARD_HEIGHT - 1) ||
    (Math.abs(dx) === BOARD_WIDTH - 1 && dy === 0)
  )
}

function biastogridsign(delta: number): -1 | 0 | 1 {
  // control jumped opposite the travel direction (east exit → dx negative).
  if (delta < 0) {
    return 1
  }
  if (delta > 0) {
    return -1
  }
  return 0
}

function focusneartarget(
  focus: number,
  target: number,
  cells: number,
): boolean {
  return Math.abs(focus - target) <= cells
}

/**
 * Board change: cardinal edge exits pan first in the departure frame (with
 * GridBias / depth-2), then mark settle for layout recenter. Non-edge changes
 * skip the pan phase. Returns true only for legacy callers; pan settle snap is
 * owned by applypanrecenter in useLayoutEffect.
 */
export function stepfocuswithboardtransition(
  userdata: FocusUserData,
  control: LayerControl,
  currentboard: string,
  tfocusx: number,
  tfocusy: number,
  delta: number,
): boolean {
  if (!ispresent(userdata.lfocusx) || !ispresent(userdata.lfocusy)) {
    userdata.lfocusx = control.focusx
    userdata.lfocusy = control.focusy
  }
  if (!ispresent(userdata.focussmooth)) {
    userdata.focussmooth = FOCUS_ANIM_RATE
  }

  if (currentboard !== userdata.currentboard) {
    const prevboard = userdata.currentboard
    const dx = control.focusx - (userdata.lfocusx ?? 0)
    const dy = control.focusy - (userdata.lfocusy ?? 0)
    const isedge = isedgeexitdelta(dx, dy)
    debugingest(
      'camerafocus.ts:stepfocuswithboardtransition',
      'camera board transition',
      {
        prevboard: prevboard ?? '',
        currentboard,
        dx,
        dy,
        isedge,
        controlx: control.focusx,
        controly: control.focusy,
        lfocusx: userdata.lfocusx ?? -1,
        lfocusy: userdata.lfocusy ?? -1,
        tfocusx,
        tfocusy,
      },
      'BC2',
    )
    userdata.currentboard = currentboard
    if (isedge) {
      const biasdx = biastogridsign(dx)
      const biasdy = biastogridsign(dy)
      userdata.gridbiasdx = biasdx
      userdata.gridbiasdy = biasdy
      userdata.panphase = true
      userdata.panrecenterpending = false
      userdata.departureboard = prevboard ?? ''
      // Travel axis follows dest+board; cross-axis freezes at current focus
      // so the glide stays cardinal (no diagonal drift toward dest spawn).
      const focusx = userdata.focusx ?? control.focusx
      const focusy = userdata.focusy ?? control.focusy
      if (biasdx !== 0) {
        userdata.pantargetx = control.focusx + biasdx * BOARD_WIDTH
        userdata.pantargety = focusy
      } else {
        userdata.pantargetx = focusx
        userdata.pantargety = control.focusy + biasdy * BOARD_HEIGHT
      }
      userdata.focussmooth = FOCUS_GLIDE_RATE
      // Keep focus in departure frame; do not apply immediate ±board snap.
    } else {
      userdata.gridbiasdx = 0
      userdata.gridbiasdy = 0
      userdata.panphase = false
      userdata.panrecenterpending = false
      userdata.departureboard = ''
    }
    userdata.lfocusx = control.focusx
    userdata.lfocusy = control.focusy
  }

  if (userdata.panphase === true) {
    const bias = readgridbias(userdata)
    const pantx = userdata.pantargetx ?? tfocusx
    const panty = userdata.pantargety ?? tfocusy
    userdata.tfocusx = pantx
    userdata.tfocusy = panty
    const focussmooth = userdata.focussmooth ?? FOCUS_ANIM_RATE
    // Damp only the travel axis; hold the cross-axis at the frozen target.
    if (bias.dx !== 0) {
      damp(userdata, 'focusx', pantx, focussmooth, delta)
      userdata.focusy = panty
    } else {
      userdata.focusx = pantx
      damp(userdata, 'focusy', panty, focussmooth, delta)
    }
    damp(userdata, 'focussmooth', FOCUS_ANIM_RATE, FOCUS_GLIDE_DECAY, delta)

    const fx = userdata.focusx ?? pantx
    const fy = userdata.focusy ?? panty
    const smooth = userdata.focussmooth ?? FOCUS_ANIM_RATE
    const travelsettled =
      bias.dx !== 0
        ? focusneartarget(fx, pantx, FOCUS_PAN_SETTLE_CELLS)
        : focusneartarget(fy, panty, FOCUS_PAN_SETTLE_CELLS)
    const settled = travelsettled && smooth <= FOCUS_ANIM_RATE * 1.5

    if (settled) {
      // Land exactly on pantarget so remapped focus matches dest control.
      userdata.focusx = pantx
      userdata.focusy = panty
      // Defer focus remap until layout tears down the departure strip.
      userdata.panrecenterpending = true
      userdata.panrecenterbiasdx = bias.dx
      userdata.panrecenterbiasdy = bias.dy
      userdata.gridbiasdx = 0
      userdata.gridbiasdy = 0
      userdata.panphase = false
      userdata.departureboard = ''
      userdata.pantargetx = undefined
      userdata.pantargety = undefined
      // Hold departure-frame focus until applypanrecenter.
      userdata.tfocusx = pantx
      userdata.tfocusy = panty
    }
  } else if (userdata.panrecenterpending === true) {
    // Hold focus until layout applies remap (do not damp across the board gap).
    userdata.tfocusx = userdata.focusx ?? tfocusx
    userdata.tfocusy = userdata.focusy ?? tfocusy
  } else {
    userdata.tfocusx = tfocusx
    userdata.tfocusy = tfocusy
    const focussmooth = userdata.focussmooth ?? FOCUS_ANIM_RATE
    damp(userdata, 'focusx', tfocusx, focussmooth, delta)
    damp(userdata, 'focusy', tfocusy, focussmooth, delta)
    damp(userdata, 'focussmooth', FOCUS_ANIM_RATE, FOCUS_GLIDE_DECAY, delta)
  }

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

/** Stash exit ids while steady so pan-first can rebuild the departure window. */
export function stashfocusexitsnap(
  userdata: FocusUserData,
  snap: FocusExitSnap,
): void {
  if (userdata.panphase === true) {
    return
  }
  userdata.exitsnap = snap
}
