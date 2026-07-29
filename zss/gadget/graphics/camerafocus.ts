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

export type BoardGrid = { x: number; y: number }

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
  /** Path-relative board slot (session / since last goto). */
  boardgridx?: number
  boardgridy?: number
  gridbiasdx?: -1 | 0 | 1
  gridbiasdy?: -1 | 0 | 1
  panphase?: boolean
  pantargetx?: number
  pantargety?: number
  departureboard?: string
  exitsnap?: FocusExitSnap
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

export function readboardgrid(userdata: FocusUserData): BoardGrid {
  return {
    x: userdata.boardgridx ?? 0,
    y: userdata.boardgridy ?? 0,
  }
}

export function worldcellfromlocal(
  gx: number,
  gy: number,
  localx: number,
  localy: number,
): { x: number; y: number } {
  return {
    x: gx * BOARD_WIDTH + localx,
    y: gy * BOARD_HEIGHT + localy,
  }
}

export function liveboardworldoffset(
  userdata: FocusUserData,
  drawwidth: number,
  drawheight: number,
): { x: number; y: number } {
  const grid = readboardgrid(userdata)
  return {
    x: grid.x * BOARD_WIDTH * drawwidth,
    y: grid.y * BOARD_HEIGHT * drawheight,
  }
}

export function isfocuspanphase(userdata: FocusUserData): boolean {
  return userdata.panphase === true
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
    userData.boardgridx = 0
    userData.boardgridy = 0
    userData.gridbiasdx = 0
    userData.gridbiasdy = 0
    userData.panphase = false
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
 * Board change: edge exits bump boardgridx/y and glide in world cell space.
 * Settle clears panphase/depth-2 only -- no focus remap. Non-edge (#goto)
 * resets the path grid to origin and teleports focus to local control.
 *
 * tfocusx/y are local (single-board) clamped targets; world conversion is
 * owned here via boardgridx/y.
 */
export function stepfocuswithboardtransition(
  userdata: FocusUserData,
  control: LayerControl,
  currentboard: string,
  localtfocusx: number,
  localtfocusy: number,
  delta: number,
): boolean {
  if (!ispresent(userdata.lfocusx) || !ispresent(userdata.lfocusy)) {
    userdata.lfocusx = control.focusx
    userdata.lfocusy = control.focusy
  }
  if (!ispresent(userdata.focussmooth)) {
    userdata.focussmooth = FOCUS_ANIM_RATE
  }
  if (!ispresent(userdata.boardgridx)) {
    userdata.boardgridx = 0
  }
  if (!ispresent(userdata.boardgridy)) {
    userdata.boardgridy = 0
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
        boardgridx: userdata.boardgridx ?? 0,
        boardgridy: userdata.boardgridy ?? 0,
        localtfocusx,
        localtfocusy,
      },
      'BC2',
    )
    userdata.currentboard = currentboard
    if (isedge) {
      const biasdx = biastogridsign(dx)
      const biasdy = biastogridsign(dy)
      userdata.boardgridx = (userdata.boardgridx ?? 0) + biasdx
      userdata.boardgridy = (userdata.boardgridy ?? 0) + biasdy
      userdata.gridbiasdx = biasdx
      userdata.gridbiasdy = biasdy
      userdata.panphase = true
      userdata.departureboard = prevboard ?? ''
      const focusx = userdata.focusx ?? control.focusx
      const focusy = userdata.focusy ?? control.focusy
      const world = worldcellfromlocal(
        userdata.boardgridx,
        userdata.boardgridy,
        localtfocusx,
        localtfocusy,
      )
      // Travel axis follows dest world cell; cross-axis freezes (cardinal).
      if (biasdx !== 0) {
        userdata.pantargetx = world.x
        userdata.pantargety = focusy
      } else {
        userdata.pantargetx = focusx
        userdata.pantargety = world.y
      }
      userdata.focussmooth = FOCUS_GLIDE_RATE
    } else {
      userdata.boardgridx = 0
      userdata.boardgridy = 0
      userdata.gridbiasdx = 0
      userdata.gridbiasdy = 0
      userdata.panphase = false
      userdata.departureboard = ''
      userdata.pantargetx = undefined
      userdata.pantargety = undefined
      // Teleport into local board space (#goto / non-edge).
      userdata.focusx = localtfocusx
      userdata.focusy = localtfocusy
      userdata.focussmooth = FOCUS_ANIM_RATE
    }
    userdata.lfocusx = control.focusx
    userdata.lfocusy = control.focusy
  }

  const grid = readboardgrid(userdata)
  const worldsteady = worldcellfromlocal(
    grid.x,
    grid.y,
    localtfocusx,
    localtfocusy,
  )

  if (userdata.panphase === true) {
    const bias = readgridbias(userdata)
    const pantx = userdata.pantargetx ?? worldsteady.x
    const panty = userdata.pantargety ?? worldsteady.y
    userdata.tfocusx = pantx
    userdata.tfocusy = panty
    const focussmooth = userdata.focussmooth ?? FOCUS_ANIM_RATE
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
      userdata.focusx = pantx
      userdata.focusy = panty
      userdata.gridbiasdx = 0
      userdata.gridbiasdy = 0
      userdata.panphase = false
      userdata.departureboard = ''
      userdata.pantargetx = undefined
      userdata.pantargety = undefined
      userdata.tfocusx = pantx
      userdata.tfocusy = panty
    }
  } else {
    userdata.tfocusx = worldsteady.x
    userdata.tfocusy = worldsteady.y
    const focussmooth = userdata.focussmooth ?? FOCUS_ANIM_RATE
    damp(userdata, 'focusx', worldsteady.x, focussmooth, delta)
    damp(userdata, 'focusy', worldsteady.y, focussmooth, delta)
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

/** Stash exit ids while steady so pending board-change can infer travel bias. */
export function stashfocusexitsnap(
  userdata: FocusUserData,
  snap: FocusExitSnap,
): void {
  if (userdata.panphase === true) {
    return
  }
  userdata.exitsnap = snap
}
