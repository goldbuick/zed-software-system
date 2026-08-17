import {
  BOARD_TV_COLS,
  BOARD_TV_COMPOSITOR_HEIGHT,
  BOARD_TV_COMPOSITOR_WIDTH,
  BOARD_TV_ROWS,
} from 'zss/feature/mediaqueue/constants'
import { boardtvmarqueewindow } from 'zss/gadget/boardtvmarqueewindow'
import { buildboxframe } from 'zss/gadget/boxframe'
import { type TILE_DATA, writetile } from 'zss/gadget/tiles'
import { COLOR } from 'zss/words/types'

const MARQUEE_FG = COLOR.PURPLE
const MARQUEE_BG = COLOR.BLACK

const INNER_TOP = 1
const INNER_BOTTOM = BOARD_TV_ROWS - 2

/** Border + black interior on one tile map; interior is opaque black (not ONCLEAR). */
export function initboardtvgrid(): {
  char: number[]
  color: number[]
  bg: number[]
} {
  const frame = buildboxframe(BOARD_TV_COLS, BOARD_TV_ROWS, COLOR.PURPLE)
  for (let y = 0; y < BOARD_TV_ROWS; ++y) {
    for (let x = 0; x < BOARD_TV_COLS; ++x) {
      const isborder =
        x === 0 || x === BOARD_TV_COLS - 1 || y === 0 || y === BOARD_TV_ROWS - 1
      const i = x + y * BOARD_TV_COLS
      frame.bg[i] = COLOR.BLACK
      if (!isborder) {
        frame.char[i] = 0
      }
    }
  }
  return frame
}

/** Interior screen rows that stay video-only (marquee row excluded). */
export function boardtvscreenrows(marqueerow: number): {
  start: number
  count: number
} {
  if (marqueerow <= INNER_TOP) {
    return {
      start: marqueerow + 1,
      count: INNER_BOTTOM - marqueerow,
    }
  }
  if (marqueerow >= INNER_BOTTOM) {
    return { start: INNER_TOP, count: marqueerow - INNER_TOP }
  }
  return { start: INNER_TOP, count: INNER_BOTTOM - INNER_TOP + 1 }
}

export function boardtvvideorect(
  marqueerow: number,
  drawwidth: number,
  drawheight: number,
  tvdrawheight: number,
): { width: number; height: number; centerx: number; centery: number } {
  const { start, count } = boardtvscreenrows(marqueerow)
  const innercols = BOARD_TV_COLS - 2
  const width = innercols * drawwidth
  const height = count * drawheight
  const centerx = 0
  const centery = -tvdrawheight * 0.5 + start * drawheight + height * 0.5
  return { width, height, centerx, centery }
}

/** Letterbox the stream inside the screen rect, keeping source aspect. */
export function boardtvvideofit(
  videowidth: number,
  videoheight: number,
  rect: { width: number; height: number; centerx: number; centery: number },
): { width: number; height: number; centerx: number; centery: number } {
  // Compositor canvas matches inner 38x13 cells; use that until metadata lands.
  const vw = Math.max(1, videowidth || BOARD_TV_COMPOSITOR_WIDTH)
  const vh = Math.max(1, videoheight || BOARD_TV_COMPOSITOR_HEIGHT)
  const scale = Math.min(rect.width / vw, rect.height / vh)
  return {
    width: vw * scale,
    height: vh * scale,
    centerx: rect.centerx,
    centery: rect.centery,
  }
}

export function drawboardtvmarqueerow(
  state: TILE_DATA,
  row: number,
  label: string,
  offset: number,
) {
  const trimmed = label.trim()
  const window = trimmed ? boardtvmarqueewindow(trimmed, offset) : ''
  for (let x = 1; x < BOARD_TV_COLS - 1; ++x) {
    const col = x - 1
    if (!window) {
      writetile(state, BOARD_TV_COLS, BOARD_TV_ROWS, x, row, {
        char: 0,
        bg: COLOR.BLACK,
      })
      continue
    }
    writetile(state, BOARD_TV_COLS, BOARD_TV_ROWS, x, row, {
      char: window.charCodeAt(col),
      color: MARQUEE_FG,
      bg: MARQUEE_BG,
    })
  }
  state.changed()
}
