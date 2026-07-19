/** Bottom control band height in portrait (chars). */
export const PORTRAIT_TOUCH_DOCK_ROWS = 14

/** Each stick rail width in landscape (chars). */
export const LANDSCAPE_TOUCH_RAIL_COLS = 10

/** Stats sidebar width (chars); matches screenui SIDEBAR_SIZE. */
export const TOUCH_SIDEBAR_COLS = 20

/** Portrait stats band height when sidebar open (chars). */
export const PORTRAIT_SIDEBAR_OVERLAY_ROWS = 15

/** Portrait dock rows reserved above stick plane (header + action row). */
export const PORTRAIT_DOCK_STICK_TOP = 5

/** Landscape / portrait action row: 3 keys x 5 + 2 gaps. */
export const ACTION_ROW_WIDTH = 17

export type TouchUIMode =
  | 'portrait-dock'
  | 'landscape-rail-left'
  | 'landscape-rail-right'
  | 'landscape-actions'
