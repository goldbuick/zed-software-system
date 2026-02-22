import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { EDITOR_CODE_ROW } from './common'

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
const MIN_PREFIX_GENERAL = 1

function filtersuggestions(
  prefix: string,
  minlen: number,
  words: string[],
): string[] {
  if (prefix.length < minlen) return []
  const lower = prefix.toLowerCase()
  return words
    .filter(
      (w) => w.toLowerCase().startsWith(lower) && w.toLowerCase() !== lower,
    )
    .sort()
    .slice(0, MAX_SUGGESTIONS)
}

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
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(
      prefix,
      MIN_PREFIX_COMMAND,
      commandwords,
    )
    return { suggestions, prefix, wordcol, wordstart }
  }

  const wordmatch = /(\w+)$/.exec(linetext)
  if (wordmatch) {
    const prefix = wordmatch[1]
    if (/^\d+$/.test(prefix)) return EMPTY_AUTOCOMPLETE
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(prefix, MIN_PREFIX_GENERAL, allwords)
    return { suggestions, prefix, wordcol, wordstart }
  }

  return EMPTY_AUTOCOMPLETE
}

export function getlineautocomplete(
  line: string,
  cursor: number,
  commandwords: string[],
  allwords: string[],
): AUTOCOMPLETE {
  const linetext = line.substring(0, cursor)

  const cmdmatch = /#(\w+)$/.exec(linetext)
  if (cmdmatch) {
    const prefix = cmdmatch[1]
    const wordcol = cursor - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(
      prefix,
      MIN_PREFIX_COMMAND,
      commandwords,
    )
    return { suggestions, prefix, wordcol, wordstart }
  }

  const wordmatch = /(\w+)$/.exec(linetext)
  if (wordmatch) {
    const prefix = wordmatch[1]
    if (/^\d+$/.test(prefix)) return EMPTY_AUTOCOMPLETE
    const wordcol = cursor - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(prefix, MIN_PREFIX_GENERAL, allwords)
    return { suggestions, prefix, wordcol, wordstart }
  }

  return EMPTY_AUTOCOMPLETE
}

const AC_BG = COLOR.DKBLUE
const AC_FG = COLOR.LTGRAY
const AC_SEL_BG = COLOR.BLUE
const AC_SEL_FG = COLOR.WHITE

export type AutocompleteEdge = ReturnType<typeof textformatreadedges>

function applySuggestionColors(
  bufindex: number,
  textoffset: number,
  text: string,
  word: string,
  selected: boolean,
  bg: number,
  wordcolors: Map<string, number> | undefined,
  context: WRITE_TEXT_CONTEXT,
) {
  const defaultfg = selected ? AC_SEL_FG : AC_FG
  applystrtoindex(bufindex, text, context)

  if (!wordcolors) {
    applycolortoindexes(
      bufindex,
      bufindex + text.length - 1,
      defaultfg,
      bg,
      context,
    )
    return
  }

  const wordcolor = wordcolors.get(word.toLowerCase()) ?? defaultfg
  for (let c = 0; c < text.length; c++) {
    const charoffset = textoffset + c
    const ispadding = charoffset === 0 || charoffset > word.length
    const fg = ispadding ? defaultfg : wordcolor
    context.color[bufindex + c] = fg
    context.bg[bufindex + c] = bg
  }
  context.changed()
}

export function drawautocomplete(
  ac: AUTOCOMPLETE,
  acindex: number,
  ycursor: number,
  xoffset: number,
  yoffset: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  wordcolors?: Map<string, number>,
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
    applySuggestionColors(
      bufindex,
      textoffset,
      text,
      ac.suggestions[i],
      selected,
      bg,
      wordcolors,
      context,
    )
  }
}

export function drawlineautocomplete(
  ac: AUTOCOMPLETE,
  acindex: number,
  inputy: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  wordcolors?: Map<string, number>,
) {
  if (ac.suggestions.length === 0 || acindex < 0) return

  const startx = edge.left + ac.wordcol
  const maxitemlen = ac.suggestions.reduce(
    (max, s) => Math.max(max, s.length),
    0,
  )
  const itemwidth = maxitemlen + 2

  for (let i = 0; i < ac.suggestions.length; i++) {
    const y = inputy - 1 - i
    if (y < edge.top || y >= edge.bottom) continue

    const selected = i === acindex
    const bg = selected ? AC_SEL_BG : AC_BG

    const rowstart = Math.max(startx, edge.left)
    const rowend = Math.min(startx + itemwidth - 1, edge.right)
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
    applySuggestionColors(
      bufindex,
      textoffset,
      text,
      ac.suggestions[i],
      selected,
      bg,
      wordcolors,
      context,
    )
  }
}
