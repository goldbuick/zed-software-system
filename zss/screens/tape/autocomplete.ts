import { romintolookup, romread } from 'zss/feature/rom'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { EDITOR_CODE_ROW } from './common'

export type AUTOCOMPLETE_CATEGORY = 'command' | 'stat' | 'statvalue' | 'general'

export type AUTOCOMPLETE = {
  suggestions: string[]
  prefix: string
  wordcol: number
  wordstart: number
  iscommand: boolean
  category: AUTOCOMPLETE_CATEGORY
}

export const EMPTY_AUTOCOMPLETE: AUTOCOMPLETE = {
  suggestions: [],
  prefix: '',
  wordcol: 0,
  wordstart: 0,
  iscommand: false,
  category: 'general',
}

const ROM_CATEGORIES = [
  'command',
  'flag',
  'stat',
  'color',
  'dir',
  'dirmod',
  'expr',
]

function extractdesc(content: string): string {
  const lookup = romintolookup(content)
  const desc = lookup.desc ?? ''
  return desc.replace(/^\$\w+/i, '').trim()
}

export function romhintfor(word: string): string {
  const lower = word.toLowerCase().trim()
  if (!lower) {
    return ''
  }
  for (const category of ROM_CATEGORIES) {
    const content = romread(`editor:${category}:${lower}`)
    if (content) {
      return extractdesc(content)
    }
  }
  return ''
}

const MAX_SUGGESTIONS = 8
const MIN_PREFIX_COMMAND = 1
const MIN_PREFIX_GENERAL = 1

function filtersuggestions(
  prefix: string,
  minlen: number,
  words: string[],
): string[] {
  if (prefix.length < minlen) {
    return []
  }
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
  statwords: string[],
  allwords: string[],
): AUTOCOMPLETE {
  const row = rows[ycursor]
  if (!row) {
    return EMPTY_AUTOCOMPLETE
  }

  const col = cursor - row.start
  const linetext = row.code.substring(0, col)

  const cmdmatch = /#(\w*)$/.exec(linetext)
  if (cmdmatch) {
    const prefix = cmdmatch[1]
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(
      prefix,
      MIN_PREFIX_COMMAND,
      commandwords,
    )
    return {
      suggestions,
      prefix,
      wordcol,
      wordstart,
      iscommand: true,
      category: 'command',
    }
  }

  const statnamematch = /(?:^|\s)@(\w*)$/.exec(linetext)
  if (statnamematch) {
    const prefix = statnamematch[1]
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(prefix, MIN_PREFIX_GENERAL, statwords)
    return {
      suggestions,
      prefix,
      wordcol,
      wordstart,
      iscommand: false,
      category: 'stat',
    }
  }

  const statvaluematch = /@\S+\s+(\w*)$/.exec(linetext)
  if (statvaluematch) {
    return EMPTY_AUTOCOMPLETE
  }

  const wordmatch = /(\w+)$/.exec(linetext)
  if (wordmatch) {
    const prefix = wordmatch[1]
    if (/^\d+$/.test(prefix)) {
      return EMPTY_AUTOCOMPLETE
    }
    const wordcol = col - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(prefix, MIN_PREFIX_GENERAL, allwords)
    return {
      suggestions,
      prefix,
      wordcol,
      wordstart,
      iscommand: false,
      category: 'general',
    }
  }

  return EMPTY_AUTOCOMPLETE
}

export function getlineautocomplete(
  line: string,
  cursor: number,
  commandwords: string[],
  statwords: string[],
  allwords: string[],
): AUTOCOMPLETE {
  const linetext = line.substring(0, cursor)

  const cmdmatch = /#(\w*)$/.exec(linetext)
  if (cmdmatch) {
    const prefix = cmdmatch[1]
    const wordcol = cursor - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(
      prefix,
      MIN_PREFIX_COMMAND,
      commandwords,
    )
    return {
      suggestions,
      prefix,
      wordcol,
      wordstart,
      iscommand: true,
      category: 'command',
    }
  }

  const statnamematch = /(?:^|\s)@(\w*)$/.exec(linetext)
  if (statnamematch) {
    const prefix = statnamematch[1]
    const wordcol = cursor - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(prefix, MIN_PREFIX_GENERAL, statwords)
    return {
      suggestions,
      prefix,
      wordcol,
      wordstart,
      iscommand: false,
      category: 'stat',
    }
  }

  const statvaluematch = /@\S+\s+(\w*)$/.exec(linetext)
  if (statvaluematch) {
    return EMPTY_AUTOCOMPLETE
  }

  const wordmatch = /(\w+)$/.exec(linetext)
  if (wordmatch) {
    const prefix = wordmatch[1]
    if (/^\d+$/.test(prefix)) {
      return EMPTY_AUTOCOMPLETE
    }
    const wordcol = cursor - prefix.length
    const wordstart = cursor - prefix.length
    const suggestions = filtersuggestions(prefix, MIN_PREFIX_GENERAL, allwords)
    return {
      suggestions,
      prefix,
      wordcol,
      wordstart,
      iscommand: false,
      category: 'general',
    }
  }

  return EMPTY_AUTOCOMPLETE
}

const AC_BG = COLOR.BLACK
const AC_FG = COLOR.LTGRAY
const AC_SEL_BG = COLOR.DKBLUE
const AC_SEL_FG = COLOR.WHITE
const AC_HINT_FG = COLOR.DKGRAY
export type AutocompleteEdge = ReturnType<typeof textformatreadedges>

function applysuggestioncolors(
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

function drawhinttext(
  hint: string,
  hintx: number,
  hinty: number,
  rightbound: number,
  bg: number,
  context: WRITE_TEXT_CONTEXT,
) {
  if (!hint || hintx > rightbound) {
    return
  }
  const available = rightbound - hintx + 1
  const text = hint.length > available ? hint.substring(0, available) : hint
  const bufindex = hintx + hinty * context.width
  applystrtoindex(bufindex, text, context)
  applycolortoindexes(
    bufindex,
    bufindex + text.length - 1,
    AC_HINT_FG,
    bg,
    context,
  )
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
  if (ac.suggestions.length === 0) {
    return
  }

  const effectiveIndex = acindex < 0 ? 0 : acindex
  const startx = edge.left + ac.wordcol - xoffset
  const cursorRowY = edge.top + 2 + ycursor - yoffset + 1
  const numRows = ac.suggestions.length
  const drawBelow = cursorRowY + numRows <= edge.bottom - 1
  const starty = drawBelow
    ? cursorRowY
    : Math.max(edge.top + 1, cursorRowY - numRows - 1)

  const maxitemlen = ac.suggestions.reduce(
    (max, s) => Math.max(max, s.length),
    0,
  )
  const itemwidth = maxitemlen + 2

  for (let i = 0; i < ac.suggestions.length; i++) {
    const y = drawBelow ? starty + i : starty + numRows - 1 - i
    if (y >= edge.bottom || y <= edge.top + 1) {
      continue
    }

    const selected = i === effectiveIndex
    const bg = selected ? AC_SEL_BG : AC_BG

    const rowstart = Math.max(startx, edge.left + 1)
    const rowend = Math.min(startx + itemwidth - 1, edge.right - 1)
    if (rowstart > rowend) {
      continue
    }

    const textoffset = rowstart - startx
    const fulltext = ` ${ac.suggestions[i]} `
      .padEnd(itemwidth, ' ')
      .substring(0, itemwidth)
    const text = fulltext.substring(
      textoffset,
      textoffset + (rowend - rowstart + 1),
    )

    const bufindex = rowstart + y * context.width
    applysuggestioncolors(
      bufindex,
      textoffset,
      text,
      ac.suggestions[i],
      selected,
      bg,
      wordcolors,
      context,
    )

    if (selected) {
      const hint = romhintfor(ac.suggestions[i])
      if (hint) {
        const hintx = rowstart + text.length
        drawhinttext(hint, hintx, y, edge.right, AC_BG, context)
      }
    }
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
  if (ac.suggestions.length === 0) {
    return
  }
  const effectiveindex = acindex < 0 ? 0 : acindex

  const startx = edge.left + ac.wordcol
  const maxitemlen = ac.suggestions.reduce(
    (max, s) => Math.max(max, s.length),
    0,
  )
  const itemwidth = maxitemlen + 2

  for (let i = 0; i < ac.suggestions.length; i++) {
    const y = inputy - 1 - i
    if (y < edge.top || y >= edge.bottom) {
      continue
    }

    const selected = i === effectiveindex
    const bg = selected ? AC_SEL_BG : AC_BG

    const rowstart = Math.max(startx, edge.left)
    const rowend = Math.min(startx + itemwidth - 1, edge.right)
    if (rowstart > rowend) {
      continue
    }

    const textoffset = rowstart - startx
    const fulltext = ` ${ac.suggestions[i]} `
      .padEnd(itemwidth, ' ')
      .substring(0, itemwidth)
    const text = fulltext.substring(
      textoffset,
      textoffset + (rowend - rowstart + 1),
    )

    const bufindex = rowstart + y * context.width
    applysuggestioncolors(
      bufindex,
      textoffset,
      text,
      ac.suggestions[i],
      selected,
      bg,
      wordcolors,
      context,
    )

    if (selected) {
      const hint = romhintfor(ac.suggestions[i])
      if (hint) {
        const hintx = rowstart + text.length
        drawhinttext(hint, hintx, y, edge.right, AC_BG, context)
      }
    }
  }
}
