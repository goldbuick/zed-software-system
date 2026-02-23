import { romintolookup, romread } from 'zss/feature/rom'
import * as lexer from 'zss/lang/lexer'
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

function romhintfor(word: string): string {
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

const COMMAND_WORD_TOKEN_TYPES = new Set([
  lexer.command_play.tokenTypeIdx,
  lexer.command_toast.tokenTypeIdx,
  lexer.command_ticker.tokenTypeIdx,
  lexer.command_if.tokenTypeIdx,
  lexer.command_do.tokenTypeIdx,
  lexer.command_done.tokenTypeIdx,
  lexer.command_else.tokenTypeIdx,
  lexer.command_while.tokenTypeIdx,
  lexer.command_repeat.tokenTypeIdx,
  lexer.command_waitfor.tokenTypeIdx,
  lexer.command_foreach.tokenTypeIdx,
  lexer.command_break.tokenTypeIdx,
  lexer.command_continue.tokenTypeIdx,
])

function getautocompletefromtokens(
  row: EDITOR_CODE_ROW,
  col: number,
  commandwords: string[],
  statwords: string[],
  allwords: string[],
): AUTOCOMPLETE | null {
  const tokens = row.tokens
  if (!tokens?.length) {
    return null
  }
  const cursorCol1 = col + 1
  let activetokenidx = -1
  let aftertokenidx = -1
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t]
    const sc = tok.startColumn ?? 1
    const ec = tok.endColumn ?? 1
    if (cursorCol1 >= sc && cursorCol1 <= ec) {
      activetokenidx = t
      break
    }
    if (ec === cursorCol1 - 1) {
      aftertokenidx = t
    }
  }
  if (activetokenidx >= 0) {
    const token = tokens[activetokenidx]
    const prev = tokens[activetokenidx - 1]
    const idx = token.startColumn ?? 1
    const prefix = row.code.substring(idx - 1, col)
    const wordcol = idx - 1
    const wordstart = row.start + wordcol
    if (token.tokenTypeIdx === lexer.command.tokenTypeIdx) {
      return {
        suggestions: filtersuggestions('', MIN_PREFIX_COMMAND, commandwords),
        prefix: '',
        wordcol,
        wordstart,
        iscommand: true,
        category: 'command',
      }
    }
    if (COMMAND_WORD_TOKEN_TYPES.has(token.tokenTypeIdx)) {
      return EMPTY_AUTOCOMPLETE
    }
    if (token.tokenTypeIdx === lexer.stat.tokenTypeIdx) {
      const statprefix = prefix.replace(/^@/, '')
      return {
        suggestions: filtersuggestions(
          statprefix,
          MIN_PREFIX_GENERAL,
          statwords,
        ),
        prefix: statprefix,
        wordcol,
        wordstart,
        iscommand: false,
        category: 'stat',
      }
    }
    if (token.tokenTypeIdx === lexer.text.tokenTypeIdx) {
      const isafterhash =
        prev && prev.tokenTypeIdx === lexer.command.tokenTypeIdx
      if (isafterhash) {
        return {
          suggestions: filtersuggestions(
            prefix,
            MIN_PREFIX_COMMAND,
            commandwords,
          ),
          prefix,
          wordcol,
          wordstart,
          iscommand: true,
          category: 'command',
        }
      }
      if (/^\d+$/.test(prefix)) {
        return EMPTY_AUTOCOMPLETE
      }
      return {
        suggestions: filtersuggestions(prefix, MIN_PREFIX_GENERAL, allwords),
        prefix,
        wordcol,
        wordstart,
        iscommand: false,
        category: 'general',
      }
    }
    return null
  }
  if (aftertokenidx >= 0) {
    const token = tokens[aftertokenidx]
    if (token.tokenTypeIdx === lexer.command.tokenTypeIdx) {
      const endCol1 = token.endColumn ?? 1
      const wordcol = endCol1
      const wordstart = row.start + wordcol
      return {
        suggestions: filtersuggestions('', MIN_PREFIX_COMMAND, commandwords),
        prefix: '',
        wordcol,
        wordstart,
        iscommand: true,
        category: 'command',
      }
    }
  }
  return null
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
  const fromtokens = getautocompletefromtokens(
    row,
    col,
    commandwords,
    statwords,
    allwords,
  )
  if (fromtokens !== null) {
    return fromtokens
  }

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
  cursorRowY: number,
  startx: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  wordcolors?: Map<string, number>,
  drawAbove?: boolean,
) {
  if (ac.suggestions.length === 0) {
    return
  }

  const effectiveIndex = acindex < 0 ? 0 : acindex
  const numRows = ac.suggestions.length
  const maxitemlen = ac.suggestions.reduce(
    (max, s) => Math.max(max, s.length),
    0,
  )
  const itemwidth = maxitemlen + 2

  let starty: number
  let yForIndex: (i: number) => number
  if (drawAbove) {
    starty = cursorRowY - numRows
    yForIndex = (i) => starty + i
  } else {
    const drawBelow = cursorRowY + numRows <= edge.bottom - 1
    starty = drawBelow
      ? cursorRowY
      : Math.max(edge.top + 1, cursorRowY - numRows - 1)
    yForIndex = (i) => (drawBelow ? starty + i : starty + numRows - 1 - i)
  }

  const minY = drawAbove ? edge.top : edge.top + 2
  for (let i = 0; i < ac.suggestions.length; i++) {
    const y = yForIndex(i)
    if (y >= edge.bottom || y < minY) {
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
