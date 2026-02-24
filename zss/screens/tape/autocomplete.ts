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

export type AUTOCOMPLETE_CATEGORY =
  | 'command'
  | 'flag'
  | 'stat'
  | 'kind'
  | 'color'
  | 'dir'
  | 'dirmod'
  | 'expr'
  | 'none'

/** Words per category for autocomplete. Ensures each category has a word list. */
export type AUTOCOMPLETE_WORDS = {
  command: string[]
  flag: string[]
  stat: string[]
  kind: string[]
  color: string[]
  dir: string[]
  dirmod: string[]
  expr: string[]
}

export type AUTOCOMPLETE = {
  suggestions: string[]
  prefix: string
  wordcol: number
  wordstart: number
  category: AUTOCOMPLETE_CATEGORY
}

export const EMPTY_AUTOCOMPLETE: AUTOCOMPLETE = {
  suggestions: [],
  prefix: '',
  wordcol: 0,
  wordstart: 0,
  category: 'none',
}

const ROM_CATEGORIES = [
  'command',
  'flag',
  'stat',
  'kind',
  'color',
  'dir',
  'dirmod',
  'expr',
  'none',
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

function filtersuggestions(prefix: string, words: string[]): string[] {
  if (prefix.length < 1) {
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

function getautocompletefromtokens(
  row: EDITOR_CODE_ROW,
  col: number,
  words: AUTOCOMPLETE_WORDS,
): AUTOCOMPLETE | null {
  const tokens = row.tokens
  if (!tokens?.length) {
    return null
  }
  const cursor = col + 1

  let activetokenidx = -1
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t]
    const startx = tok.startColumn ?? 1
    const endx = tok.endColumn ?? 1
    if (cursor >= startx && cursor <= endx) {
      activetokenidx = t
      break
    }
  }

  if (activetokenidx >= 0) {
    // handle being at the end of a line
    if (
      activetokenidx > 0 &&
      tokens[activetokenidx].tokenTypeIdx === lexer.newline.tokenTypeIdx
    ) {
      --activetokenidx
    }

    // get token context
    const token = tokens[activetokenidx]
    const prev = tokens[activetokenidx - 1]
    const wordcol = token.endColumn ?? 1
    const wordstart = row.start + (token.startColumn ?? 1) - 1

    const prefix = token.image
    switch (token.tokenTypeIdx) {
      case lexer.text.tokenTypeIdx:
      case lexer.stringliteral.tokenTypeIdx:
      case lexer.stringliteraldouble.tokenTypeIdx:
        switch (prev?.tokenTypeIdx) {
          case lexer.command.tokenTypeIdx:
            return {
              suggestions: filtersuggestions(prefix, words.command),
              prefix,
              wordcol,
              wordstart,
              category: 'command',
            }
          case lexer.stat.tokenTypeIdx:
            return {
              suggestions: filtersuggestions(prefix, words.stat),
              prefix,
              wordcol,
              wordstart,
              category: 'stat',
            }
          default:
            console.info('prev unknown', prev)
            break
        }
        break
      case lexer.stat.tokenTypeIdx:
        // only consider autocomplete for stats if we are in the editor
        break
      case lexer.label.tokenTypeIdx:
      case lexer.comment.tokenTypeIdx:
        // skip
        break
      case lexer.command_play.tokenTypeIdx:
        // notes ??
        break
      case lexer.command_toast.tokenTypeIdx:
      case lexer.command_ticker.tokenTypeIdx:
      case lexer.command_if.tokenTypeIdx:
      case lexer.command_do.tokenTypeIdx:
      case lexer.command_done.tokenTypeIdx:
      case lexer.command_else.tokenTypeIdx:
      case lexer.command_while.tokenTypeIdx:
      case lexer.command_repeat.tokenTypeIdx:
      case lexer.command_waitfor.tokenTypeIdx:
      case lexer.command_foreach.tokenTypeIdx:
      case lexer.command_break.tokenTypeIdx:
      case lexer.command_continue.tokenTypeIdx:
        break
      default:
        console.info('token unknown', token)
        break
    }
  }
  return null
}

export function getautocomplete(
  rows: EDITOR_CODE_ROW[],
  cursor: number,
  ycursor: number,
  words: AUTOCOMPLETE_WORDS,
): AUTOCOMPLETE {
  const row = rows[ycursor]
  if (!row) {
    return EMPTY_AUTOCOMPLETE
  }

  const col = cursor - row.start
  const fromtokens = getautocompletefromtokens(row, col, words)
  console.info('fromtokens', fromtokens)
  if (fromtokens !== null) {
    return fromtokens
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
  py: number,
  px: number,
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
    starty = py - numRows
    yForIndex = (i) => starty + i
  } else {
    const drawBelow = py + numRows <= edge.bottom - 1
    starty = drawBelow ? py : Math.max(edge.top + 1, py - numRows - 1)
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

    const rowstart = Math.max(px, edge.left + 1)
    const rowend = Math.min(px + itemwidth - 1, edge.right - 1)
    if (rowstart > rowend) {
      continue
    }

    const textoffset = rowstart - px
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
