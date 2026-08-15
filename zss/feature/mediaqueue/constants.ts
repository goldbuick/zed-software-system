/** Landscape board TV size in char cells (all graphics modes). */
export const BOARD_TV_COLS = 40
export const BOARD_TV_ROWS = 15

/** FPV stands the TV; flat / iso / mode7 lay it on the board plane. */
export function boardtvisupright(graphics: string): boolean {
  return graphics === 'fpv'
}
