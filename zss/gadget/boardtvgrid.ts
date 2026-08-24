import {
  BOARD_TV_COLS,
  BOARD_TV_COMPOSITOR_HEIGHT,
  BOARD_TV_COMPOSITOR_WIDTH,
  BOARD_TV_ROWS,
} from 'zss/feature/mediaqueue/constants'

/** Full TV footprint in cell rows (video fills the mount; no chrome inset). */
export function boardtvscreenrows(): {
  start: number
  count: number
} {
  return { start: 0, count: BOARD_TV_ROWS }
}

export function boardtvvideorect(
  drawwidth: number,
  drawheight: number,
  tvdrawheight: number,
): { width: number; height: number; centerx: number; centery: number } {
  const { start, count } = boardtvscreenrows()
  const width = BOARD_TV_COLS * drawwidth
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
  // Compositor canvas matches full TV cells; use that until metadata lands.
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
