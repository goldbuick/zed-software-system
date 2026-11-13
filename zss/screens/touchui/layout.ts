import { clamp } from 'zss/mapping/number'

/** Bottom control band height in portrait (chars). */
export const PORTRAIT_TOUCH_DOCK_ROWS = 14

/** Stats sidebar width (chars); matches screenui SIDEBAR_SIZE. */
export const TOUCH_SIDEBAR_COLS = 20

/** Portrait dock rows reserved above stick plane (header + action row). */
export const PORTRAIT_DOCK_STICK_TOP = 5

/** Portrait action row: 7 keys x 5 + 6 gaps (pitch 6). */
export const ACTION_ROW_WIDTH = 41

/** Minimum game / editor frame rows while the dock is present. */
const MIN_TOUCH_CONTENT_ROWS = 10

export type TOUCH_SCREEN_LAYOUT = {
  /** Game frame rows (cols are always the full width). */
  rows: number
  dockcols: number
  dockrows: number
  /** Dock top in chars from the frame top. */
  dockrow: number
  /** Render dock chrome / touchpads when touch controls are on. */
  showdockui: boolean
  /** Render ActionRow; false while soft keyboard is open. */
  showactionrow: boolean
}

/** Touch is portrait-only (landscape is covered by RotatePortrait). */
export function readtouchscreenlayout(args: {
  totalcols: number
  totalrows: number
  /** Visible rows above the soft keyboard (visualViewport). */
  saferows: number
  showtouchcontrols: boolean
}): TOUCH_SCREEN_LAYOUT {
  const { totalcols, totalrows, saferows, showtouchcontrols } = args
  if (!showtouchcontrols) {
    return {
      rows: totalrows,
      dockcols: 0,
      dockrows: 0,
      dockrow: 0,
      showdockui: false,
      showactionrow: false,
    }
  }
  const keyboardrows = Math.max(0, totalrows - saferows)
  const maxdock = Math.max(0, totalrows - MIN_TOUCH_CONTENT_ROWS)
  const dockrows = clamp(keyboardrows, PORTRAIT_TOUCH_DOCK_ROWS, maxdock)
  const rows = totalrows - dockrows
  return {
    rows,
    dockcols: totalcols,
    dockrows,
    dockrow: rows,
    showdockui: true,
    showactionrow: keyboardrows === 0,
  }
}
