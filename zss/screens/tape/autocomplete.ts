import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import * as lexer from 'zss/lang/lexer'
import { MAYBE } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { EDITOR_CODE_ROW } from './common'

export type AUTO_COMPLETE = {
  suggestions: string[]
  prefix: string
  wordcol: number
  wordstart: number
}

export const EMPTY_AUTOCOMPLETE: AUTO_COMPLETE = {
  suggestions: [],
  prefix: '',
  wordcol: 0,
  wordstart: 0,
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
  words: GADGET_ZSS_WORDS,
): MAYBE<AUTO_COMPLETE> {
  const tokens = row.tokens
  if (!tokens?.length) {
    return undefined
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
    const wordcol = (token.startColumn ?? 1) - 1
    const wordstart = row.start + wordcol

    const prefix = token.image
    switch (token.tokenTypeIdx) {
      case lexer.text.tokenTypeIdx:
      case lexer.stringliteral.tokenTypeIdx:
      case lexer.stringliteraldouble.tokenTypeIdx:
        switch (prev?.tokenTypeIdx) {
          case lexer.command.tokenTypeIdx:
            return {
              suggestions: filtersuggestions(prefix, [
                ...Object.keys(words.clicommands),
                ...Object.keys(words.loadercommands),
                ...Object.keys(words.runtimecommands),
              ]),
              prefix,
              wordcol,
              wordstart,
            }
          case lexer.stat.tokenTypeIdx:
            return {
              suggestions: filtersuggestions(prefix, [
                ...words.statsboard,
                ...words.statshelper,
                ...words.statssender,
                ...words.statsinteraction,
                ...words.statsboolean,
                ...words.statsconfig,
              ]),
              prefix,
              wordcol,
              wordstart,
            }
          default:
            return {
              suggestions: filtersuggestions(prefix, [
                ...words.flags,
                ...words.statsboard,
                ...words.statshelper,
                ...words.statssender,
                ...words.statsinteraction,
                ...words.statsboolean,
                ...words.statsconfig,
                ...words.kinds,
                ...words.altkinds,
                ...words.colors,
                ...words.dirs,
                ...words.dirmods,
                ...words.exprs,
              ]),
              prefix,
              wordcol,
              wordstart,
            }
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
        console.info('token unknown', token.image)
        break
    }
  }
  return undefined
}

export function getautocomplete(
  rows: EDITOR_CODE_ROW[],
  cursor: number,
  ycursor: number,
  words: GADGET_ZSS_WORDS,
): AUTO_COMPLETE {
  const row = rows[ycursor]
  if (!row) {
    return EMPTY_AUTOCOMPLETE
  }
  return (
    getautocompletefromtokens(row, cursor - row.start, words) ??
    EMPTY_AUTOCOMPLETE
  )
}

const AC_BG = COLOR.DKBLUE
const AC_FG = COLOR.WHITE
const AC_SEL_BG = COLOR.BLACK
const AC_SEL_FG = COLOR.WHITE
const AC_HINT_FG = COLOR.LTGRAY
export type AutocompleteEdge = ReturnType<typeof textformatreadedges>

function applysuggestioncolors(
  bufindex: number,
  textoffset: number,
  text: string,
  word: string,
  fg: number,
  bg: number,
  wordcolors: Map<string, number> | undefined,
  context: WRITE_TEXT_CONTEXT,
) {
  applystrtoindex(bufindex, text, context)

  if (!wordcolors) {
    applycolortoindexes(bufindex, bufindex + text.length - 1, fg, bg, context)
    return
  }

  const wordcolor = wordcolors.get(word.toLowerCase()) ?? fg
  for (let c = 0; c < text.length; c++) {
    const charoffset = textoffset + c
    const ispadding = charoffset === 0 || charoffset > word.length
    const color = ispadding ? fg : wordcolor
    context.color[bufindex + c] = color
    context.bg[bufindex + c] = bg
  }
  context.changed()
}

function drawhinttext(
  hint: string,
  hintx: number,
  hinty: number,
  rightbound: number,
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
    AC_SEL_BG,
    context,
  )
}

export function drawautocomplete(
  ac: AUTO_COMPLETE,
  acindex: number,
  px: number,
  py: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  drawabove?: boolean,
) {
  if (ac.suggestions.length === 0) {
    return
  }

  const effectiveindex = acindex < 0 ? 0 : acindex
  const numrows = ac.suggestions.length
  const maxitemlen = ac.suggestions.reduce(
    (max, s) => Math.max(max, s.length),
    0,
  )
  const itemwidth = maxitemlen + 2

  let starty: number
  let yforindex: (i: number) => number
  if (drawabove) {
    // Draw with index 0 just above the input so MOVE_UP increases acindex = highlight moves up
    starty = py - numrows
    yforindex = (i) => starty + numrows - 1 - i
  } else {
    const drawbelow = py + numrows <= edge.bottom - 1
    starty = drawbelow ? py : Math.max(edge.top + 1, py - numrows - 1)
    yforindex = (i) => (drawbelow ? starty + i : starty + numrows - 1 - i)
  }

  const minY = drawabove ? edge.top : edge.top + 2
  for (let i = 0; i < ac.suggestions.length; i++) {
    const y = yforindex(i)
    if (y >= edge.bottom || y < minY) {
      continue
    }

    const selected = i === effectiveindex
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
    // applysuggestioncolors(
    //   bufindex,
    //   textoffset,
    //   text,
    //   ac.suggestions[i],
    //   selected ? AC_SEL_FG : AC_FG,
    //   bg,
    //   wordcolors,
    //   context,
    // )

    if (selected) {
      const hint = '' //romhintfor(ac.suggestions[i], words)
      if (hint) {
        const hintx = rowstart + text.length
        drawhinttext(hint, hintx, y, edge.right, context)
      }
    }
  }
}
