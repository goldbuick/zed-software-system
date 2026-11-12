/** Bottom control band height in portrait (chars). */
export const PORTRAIT_TOUCH_DOCK_ROWS = 14

/** Stats sidebar width (chars); matches screenui SIDEBAR_SIZE. */
export const TOUCH_SIDEBAR_COLS = 20

/** Portrait stats band height when sidebar open (chars). */
export const PORTRAIT_SIDEBAR_OVERLAY_ROWS = 15

/** Portrait dock rows reserved above stick plane (header + action row). */
export const PORTRAIT_DOCK_STICK_TOP = 5

/** Portrait action row: 6 keys x 5 + 5 gaps (pitch 6). */
export const ACTION_ROW_WIDTH = 35

/** Minimum game / editor frame rows while the dock is present. */
const MIN_TOUCH_CONTENT_ROWS = 10

export type TouchUIMode = 'portrait-dock' | 'portrait-sidebartoggle'

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
  hassidebar: boolean
  sidebaropen: boolean
}): TOUCH_SCREEN_LAYOUT {
  const {
    totalcols,
    totalrows,
    saferows,
    showtouchcontrols,
    hassidebar,
    sidebaropen,
  } = args
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
  const siderows = sidebaropen && hassidebar ? PORTRAIT_SIDEBAR_OVERLAY_ROWS : 0
  // One row above the dock for the sidebar label; keep terminal out of it.
  const togglerows = hassidebar ? 1 : 0
  // Bottom band grows to match soft-keyboard height (totalrows - saferows) so
  // the game frame stays in the safe area. ActionRow is hidden while the
  // keyboard is open; dock chrome and sticks stay mounted.
  const keyboardrows = Math.max(0, totalrows - saferows)
  const maxdock = Math.max(
    0,
    totalrows - siderows - togglerows - MIN_TOUCH_CONTENT_ROWS,
  )
  const dockrows = Math.min(
    maxdock,
    Math.max(PORTRAIT_TOUCH_DOCK_ROWS, keyboardrows),
  )
  const rows = totalrows - dockrows - siderows - togglerows
  return {
    rows,
    dockcols: totalcols,
    dockrows,
    dockrow: rows + siderows + togglerows,
    showdockui: true,
    showactionrow: keyboardrows === 0,
  }
}
