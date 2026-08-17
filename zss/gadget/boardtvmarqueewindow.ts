import { BOARD_TV_INNER_COLS } from 'zss/feature/mediaqueue/constants'

const MARQUEE_PAD = 3

/** Visible window for a horizontal ticker on the board TV bottom border. */
export function boardtvmarqueewindow(
  label: string,
  offset: number,
  width: number = BOARD_TV_INNER_COLS,
): string {
  const trimmed = label.trim()
  if (!trimmed || width < 1) {
    return ''
  }
  const content = `${' '.repeat(MARQUEE_PAD)}${trimmed}${' '.repeat(MARQUEE_PAD)}`
  const len = content.length
  const start = ((offset % len) + len) % len
  let out = ''
  for (let i = 0; i < width; ++i) {
    out += content[(start + i) % len]
  }
  return out
}
