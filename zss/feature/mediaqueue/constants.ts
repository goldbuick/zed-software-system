/** Scroll chip + text-field targets for the #media menu. */

export const MEDIA_SCROLL_CHIP = 'media'
export const MEDIA_URL_TARGET = 'url'
export const MEDIA_SCROLL_NAME = 'media'

/** Landscape board TV size in char cells (all graphics modes). */
export const BOARD_TV_COLS = 40
export const BOARD_TV_ROWS = 15

/** FPV stands the TV; flat / iso / mode7 lay it on the board plane. */
export function boardtvisupright(graphics: string): boolean {
  return graphics === 'fpv'
}
