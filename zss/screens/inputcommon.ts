/**
 * Shared input helpers for editor and terminal screens.
 * Use for selection range computation, block cursor drawing, and player color.
 */

export function extractcontentfromargs(words: unknown, skip = 1): string {
  const arr = Array.isArray(words) ? words : []
  return arr
    .slice(skip)
    .flatMap((w) => (Array.isArray(w) ? w : [w]))
    .filter(
      (w): w is string | number => w !== undefined && typeof w !== 'object',
    )
    .map((w) => `${w}`)
    .join(' ')
}

import type { MAYBE } from 'zss/mapping/types'
import { ispresent } from 'zss/mapping/types'
import {
  type WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

// ---------------------------------------------------------------------------
// Selection range (editor + terminal)
// ---------------------------------------------------------------------------

export type InputSelectionRange = {
  ii1: number
  ii2: number
  iic: number
  hasselection: boolean
  selected: string
}

export type SelectionRangeOptions = {
  /** When true, selection is active even if selectEnd is present. Used when terminal requires e.g. yselect. */
  hasSelection?: boolean
}

/**
 * Compute selection range from cursor, optional select end, and full string.
 * Use for both editor (cursor/select) and terminal (xcursor/xselect with hasSelection from yselect).
 */
export function computeselectionrange(
  cursor: number,
  selectEnd: MAYBE<number>,
  strvalue: string,
  options?: SelectionRangeOptions,
): InputSelectionRange {
  const hasselection = options?.hasSelection ?? ispresent(selectEnd)

  let ii1 = cursor
  let ii2 = cursor

  if (hasselection && ispresent(selectEnd)) {
    ii1 = Math.min(cursor, selectEnd)
    ii2 = Math.max(cursor, selectEnd)
    if (cursor !== selectEnd) {
      --ii2
    }
  }

  const iic = ii2 - ii1 + 1
  const selected = hasselection ? strvalue.substring(ii1, ii2 + 1) : ''
  return { ii1, ii2, iic, hasselection, selected }
}

// ---------------------------------------------------------------------------
// Block cursor drawing (editor + terminal)
// ---------------------------------------------------------------------------

export type TextEdge = {
  left: number
  right: number
  top: number
  bottom: number
  width?: number
  height?: number
}

/**
 * Draw a single block cursor character at (x, y) in screen coordinates relative to edge.
 * Caller provides edge and context; optional fg/bg (defaults: white, DKBLUE or context.reset.bg).
 */
export function drawblockcursor(
  x: number,
  y: number,
  edge: TextEdge,
  context: WRITE_TEXT_CONTEXT,
  options?: { fg?: number; bg?: number },
): void {
  const px = edge.left + x
  const py = edge.top + y
  if (px < edge.left || px > edge.right || py < edge.top || py > edge.bottom) {
    return
  }
  const atchar = px + py * context.width
  const fg = options?.fg ?? COLOR.WHITE
  const bg = options?.bg ?? context.reset.bg
  applystrtoindex(atchar, String.fromCharCode(221), context)
  applycolortoindexes(atchar, atchar, fg, bg, context)
}

// ---------------------------------------------------------------------------
// Presence / multiplayer (editor; terminal can reuse if needed)
// ---------------------------------------------------------------------------

export function getcolorforplayer(playerId: string): string {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 50%)`
}
