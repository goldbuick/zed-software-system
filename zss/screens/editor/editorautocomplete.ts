import { EDITOR_CODE_ROW } from 'zss/screens/tape/common'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { EditorEdge } from './editorinputhelpers'

export type AUTOCOMPLETE = {
  suggestions: string[]
  prefix: string
  wordcol: number
  wordstart: number
}

export const EMPTY_AUTOCOMPLETE: AUTOCOMPLETE = {
  suggestions: [],
  prefix: '',
  wordcol: 0,
  wordstart: 0,
}

const MAX_SUGGESTIONS = 8
const MIN_PREFIX_COMMAND = 1
const MIN_PREFIX_GENERAL = 2

export function getautocomplete(
  rows: EDITOR_CODE_ROW[],
  cursor: number,
  ycursor: number,
  commandwords: string[],
  allwords: string[],
): AUTOCOMPLETE {
  const row = rows[ycursor]
  if (!row) return EMPTY_AUTOCOMPLETE

  const col = cursor - row.start
  const linetext = row.code.substring(0, col)

  const cmdmatch = /#(\w+)$/.exec(linetext)
  if (cmdmatch) {
    const prefix = cmdmatch[1]
    if (prefix.length < MIN_PREFIX_COMMAND) return EMPTY_AUTOCOMPLETE
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const lower = prefix.toLowerCase()
    const suggestions = commandwords
      .filter(
        (w) => w.toLowerCase().startsWith(lower) && w.toLowerCase() !== lower,
      )
      .sort()
      .slice(0, MAX_SUGGESTIONS)
    return { suggestions, prefix, wordcol, wordstart }
  }

  const wordmatch = /(\w+)$/.exec(linetext)
  if (wordmatch) {
    const prefix = wordmatch[1]
    if (prefix.length < MIN_PREFIX_GENERAL || /^\d+$/.test(prefix)) {
      return EMPTY_AUTOCOMPLETE
    }
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const lower = prefix.toLowerCase()
    const suggestions = allwords
      .filter(
        (w) => w.toLowerCase().startsWith(lower) && w.toLowerCase() !== lower,
      )
      .sort()
      .slice(0, MAX_SUGGESTIONS)
    return { suggestions, prefix, wordcol, wordstart }
  }

  return EMPTY_AUTOCOMPLETE
}

const AC_BG = COLOR.DKBLUE
const AC_FG = COLOR.LTGRAY
const AC_SEL_BG = COLOR.BLUE
const AC_SEL_FG = COLOR.WHITE

export function drawautocomplete(
  ac: AUTOCOMPLETE,
  acindex: number,
  ycursor: number,
  xoffset: number,
  yoffset: number,
  edge: EditorEdge,
  context: WRITE_TEXT_CONTEXT,
) {
  if (ac.suggestions.length === 0 || acindex < 0) return

  const startx = edge.left + 1 + ac.wordcol - xoffset
  const starty = edge.top + 2 + ycursor - yoffset + 1

  const maxitemlen = ac.suggestions.reduce(
    (max, s) => Math.max(max, s.length),
    0,
  )
  const itemwidth = maxitemlen + 2

  for (let i = 0; i < ac.suggestions.length; i++) {
    const y = starty + i
    if (y >= edge.bottom || y <= edge.top + 1) continue

    const selected = i === acindex
    const fg = selected ? AC_SEL_FG : AC_FG
    const bg = selected ? AC_SEL_BG : AC_BG

    const rowstart = Math.max(startx, edge.left + 1)
    const rowend = Math.min(startx + itemwidth - 1, edge.right - 1)
    if (rowstart > rowend) continue

    const textoffset = rowstart - startx
    const fulltext = ` ${ac.suggestions[i]} `
      .padEnd(itemwidth, ' ')
      .substring(0, itemwidth)
    const text = fulltext.substring(
      textoffset,
      textoffset + (rowend - rowstart + 1),
    )

    const bufindex = rowstart + y * context.width
    applystrtoindex(bufindex, text, context)
    applycolortoindexes(bufindex, bufindex + text.length - 1, fg, bg, context)
  }
}
