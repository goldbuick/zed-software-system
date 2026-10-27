/** Bottom control band height in portrait (chars). */
export const PORTRAIT_TOUCH_DOCK_ROWS = 14

/** Stats sidebar width (chars); matches screenui SIDEBAR_SIZE. */
export const TOUCH_SIDEBAR_COLS = 20

/** Portrait stats band height when sidebar open (chars). */
export const PORTRAIT_SIDEBAR_OVERLAY_ROWS = 15

/** Portrait dock rows reserved above stick plane (header + action row). */
export const PORTRAIT_DOCK_STICK_TOP = 5

/** Portrait action row: 4 keys x 5 + 3 gaps. */
export const ACTION_ROW_WIDTH = 23

export type TouchUIMode = 'portrait-dock' | 'portrait-sidebartoggle'

export type TOUCH_SCREEN_LAYOUT = {
  /** Game frame rows (cols are always the full width). */
  rows: number
  dockcols: number
  dockrows: number
  /** Dock top in chars from the frame top. */
  dockrow: number
}

/** Touch is portrait-only (landscape is covered by RotatePortrait). */
export function readtouchscreenlayout(args: {
  totalcols: number
  totalrows: number
  saferows: number
  showtouchcontrols: boolean
  hassidebar: boolean
  sidebaropen: boolean
  keyboardopen: boolean
}): TOUCH_SCREEN_LAYOUT {
  const {
    totalcols,
    totalrows,
    saferows,
    showtouchcontrols,
    hassidebar,
    sidebaropen,
    keyboardopen,
  } = args
  if (!showtouchcontrols) {
    return { rows: totalrows, dockcols: 0, dockrows: 0, dockrow: 0 }
  }
  const siderows = sidebaropen && hassidebar ? PORTRAIT_SIDEBAR_OVERLAY_ROWS : 0
  if (keyboardopen) {
    // Full saferows for game; dock unmounted while typing.
    return {
      rows: Math.max(10, saferows - siderows),
      dockcols: totalcols,
      dockrows: 0,
      dockrow: 0,
    }
  }
  // One row above the dock for the sidebar label; keep terminal out of it.
  const togglerows = hassidebar ? 1 : 0
  const rows = totalrows - PORTRAIT_TOUCH_DOCK_ROWS - siderows - togglerows
  return {
    rows,
    dockcols: totalcols,
    dockrows: PORTRAIT_TOUCH_DOCK_ROWS,
    dockrow: rows + siderows + togglerows,
  }
}
