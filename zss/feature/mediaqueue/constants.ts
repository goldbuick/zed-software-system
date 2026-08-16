import type { GRAPHICS_MODES } from 'zss/gadget/graphics/layerz'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'

/** Landscape board TV size in char cells (all graphics modes). */
export const BOARD_TV_COLS = 40
export const BOARD_TV_ROWS = 15
export const BOARD_TV_BORDER_CELLS = 1
export const BOARD_TV_INNER_COLS = BOARD_TV_COLS - BOARD_TV_BORDER_CELLS * 2
export const BOARD_TV_INNER_ROWS = BOARD_TV_ROWS - BOARD_TV_BORDER_CELLS * 2

export function boardtvinnerpixels(cw: number, ch: number) {
  return {
    width: BOARD_TV_INNER_COLS * cw,
    height: BOARD_TV_INNER_ROWS * ch,
  }
}

/** Z for board TV: just above floor tiles, below sprites. */
export function boardtvlayerz(graphics: string, drawheight: number): number {
  const mode = normalizelayerzvariant(graphics)
  switch (mode) {
    case 'flat':
      // Flat stacks layers at z=1,3,5...; terrain is 1, sprites are 3+.
      return 2
    case 'fpv':
    case 'iso':
      // Upright TV base sits between floor tiles (0) and wall pillars (~0.5 * drawheight).
      return 0.25
    case 'mode7':
      // Flat on the board plane; above TILES (0), below SPRITES (~0.5 * drawheight).
      return drawheight * 0.05
    default:
      return 2
  }
}

/** FPV and iso stand the TV upright; flat / mode7 lay it on the board plane. */
export function boardtvisupright(graphics: string): boolean {
  const mode = normalizelayerzvariant(graphics)
  return mode === 'fpv' || mode === 'iso'
}
