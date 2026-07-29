import type { Group } from 'three'
import {
  type FocusExitSnap,
  type FocusUserData,
  type GridBias,
  readboardgrid,
  readgridbias,
} from 'zss/gadget/graphics/camerafocus'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type PanView = {
  panphase: boolean
  biasdx: -1 | 0 | 1
  biasdy: -1 | 0 | 1
}

export const PANVIEW_IDLE: PanView = {
  panphase: false,
  biasdx: 0,
  biasdy: 0,
}

/** Cardinal travel bias when gadget board advanced before useFrame starts pan. */
export function biasfrompendingboardchange(
  exitsnap: FocusExitSnap | undefined,
  currentboard: string,
  userdata: FocusUserData,
): GridBias | null {
  if (!exitsnap || !currentboard) {
    return null
  }
  if (userdata.panphase === true) {
    return null
  }
  const tracked = userdata.currentboard ?? ''
  if (!tracked || tracked === currentboard) {
    return null
  }
  if (currentboard === exitsnap.exiteast) {
    return { dx: 1, dy: 0 }
  }
  if (currentboard === exitsnap.exitwest) {
    return { dx: -1, dy: 0 }
  }
  if (currentboard === exitsnap.exitnorth) {
    return { dx: 0, dy: -1 }
  }
  if (currentboard === exitsnap.exitsouth) {
    return { dx: 0, dy: 1 }
  }
  return null
}

/**
 * Board grid for render/layout: include pending edge bump before useFrame
 * advances boardgridx/y so live + previews sit at the dest slot immediately.
 */
export function readboardgridforrender(
  userdata: FocusUserData,
  currentboard: string,
): { x: number; y: number } {
  const base = readboardgrid(userdata)
  const pending = biasfrompendingboardchange(
    userdata.exitsnap,
    currentboard,
    userdata,
  )
  if (!pending) {
    return base
  }
  return {
    x: base.x + pending.dx,
    y: base.y + pending.dy,
  }
}

/**
 * Keep depth-2 panview coherent across React commit lag.
 * - Pending board change / active userdata pan: show depth-2 early.
 * - After settle clears userdata first: keep committed panview until React catches up.
 */
export function resolvepanviewforrender(
  committed: PanView,
  userdata: FocusUserData,
  currentboard: string,
): PanView {
  const pending = biasfrompendingboardchange(
    userdata.exitsnap,
    currentboard,
    userdata,
  )
  if (pending) {
    return {
      panphase: true,
      biasdx: pending.dx,
      biasdy: pending.dy,
    }
  }
  if (userdata.panphase === true) {
    const bias = readgridbias(userdata)
    return {
      panphase: true,
      biasdx: bias.dx,
      biasdy: bias.dy,
    }
  }
  return committed
}

export function panviewequals(a: PanView, b: PanView): boolean {
  return (
    a.panphase === b.panphase && a.biasdx === b.biasdx && a.biasdy === b.biasdy
  )
}

/** Place live board at its path-relative world slot (no pan bias offset). */
export function syncliveboardworldoffset(
  liveboard: Group | null,
  userdata: FocusUserData,
  currentboard: string,
  drawwidth: number,
  drawheight: number,
): void {
  if (!liveboard) {
    return
  }
  const grid = readboardgridforrender(userdata, currentboard)
  liveboard.position.set(
    grid.x * BOARD_WIDTH * drawwidth,
    grid.y * BOARD_HEIGHT * drawheight,
    0,
  )
}
