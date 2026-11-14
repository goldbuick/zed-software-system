import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

export const ROW_ACTIVE_FG = COLOR.YELLOW

/** Format tokens for row labels (matches panel `inputcolor`). */
export function rowlabelcolor(active: boolean): string {
  return active ? '$yellow' : '$white'
}

/** Active = yellow on reset bg; never purple/black row fill. */
export function applyactiverowpen(
  context: WRITE_TEXT_CONTEXT,
  active: boolean,
): void {
  context.active.bg = context.reset.bg
  context.active.color = active ? ROW_ACTIVE_FG : context.reset.color
}

/** Scroll/sidebar side chevrons; glyph on backplate DKBLUE. */
export function writerowchevrons(
  context: WRITE_TEXT_CONTEXT,
  row: number,
  leftx: number,
  rightx: number,
): void {
  context.x = leftx
  context.y = row
  tokenizeandwritetextformat(`$DKPURPLE$ONDKBLUE$175`, context, true)
  context.x = rightx
  context.y = row
  tokenizeandwritetextformat(`$DKPURPLE$ONDKBLUE$174`, context, true)
}
