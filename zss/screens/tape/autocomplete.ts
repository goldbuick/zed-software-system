import { romread, stripRomValue } from 'zss/feature/rom'
import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import * as lexer from 'zss/lang/lexer'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { zsswordcolor } from './colors'
import { EDITOR_CODE_ROW } from './common'

export type AUTO_COMPLETE_SUGGESTION = {
  word: string
  category: string
}

export type AUTO_COMPLETE = {
  suggestions: AUTO_COMPLETE_SUGGESTION[]
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

function filtersuggestions(
  prefix: string,
  items: AUTO_COMPLETE_SUGGESTION[],
): AUTO_COMPLETE_SUGGESTION[] {
  if (prefix.length < 1) {
    return []
  }
  const lower = prefix.toLowerCase()
  const seen = new Set<string>()
  return items
    .filter(({ word }) => {
      const wl = word.toLowerCase()
      if (seen.has(wl) || !wl.startsWith(lower) || wl === lower) {
        return false
      }
      seen.add(wl)
      return true
    })
    .sort((a, b) => a.word.localeCompare(b.word))
    .slice(0, MAX_SUGGESTIONS)
}

function tagwords(
  words: string[],
  category: string,
): AUTO_COMPLETE_SUGGESTION[] {
  return words.map((word) => ({ word, category }))
}

function tagrecordkeys(
  rec: Record<string, unknown>,
  category: string,
): AUTO_COMPLETE_SUGGESTION[] {
  return Object.keys(rec).map((word) => ({ word, category }))
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
                ...tagrecordkeys(words.clicommands, 'clicommands'),
                ...tagrecordkeys(words.loadercommands, 'loadercommands'),
                ...tagrecordkeys(words.runtimecommands, 'runtimecommands'),
              ]),
              prefix,
              wordcol,
              wordstart,
            }
          case lexer.stat.tokenTypeIdx:
            return {
              suggestions: filtersuggestions(prefix, [
                ...tagwords(words.statsboard, 'stats'),
                ...tagwords(words.statshelper, 'stats'),
                ...tagwords(words.statssender, 'stats'),
                ...tagwords(words.statsinteraction, 'stats'),
                ...tagwords(words.statsboolean, 'stats'),
                ...tagwords(words.statsconfig, 'stats'),
              ]),
              prefix,
              wordcol,
              wordstart,
            }
          default:
            return {
              suggestions: filtersuggestions(prefix, [
                ...tagwords(words.flags, 'flags'),
                ...tagwords(words.statsboard, 'stats'),
                ...tagwords(words.statshelper, 'stats'),
                ...tagwords(words.statssender, 'stats'),
                ...tagwords(words.statsinteraction, 'stats'),
                ...tagwords(words.statsboolean, 'stats'),
                ...tagwords(words.statsconfig, 'stats'),
                ...tagwords(words.objects, 'objects'),
                ...tagwords(words.terrains, 'terrains'),
                ...tagwords(words.boards, 'boards'),
                ...tagwords(words.palettes, 'palettes'),
                ...tagwords(words.charsets, 'charsets'),
                ...tagwords(words.loaders, 'loaders'),
                ...tagwords(words.colors, 'colors'),
                ...tagwords(words.dirs, 'dirs'),
                ...tagwords(words.dirmods, 'dirmods'),
                ...tagwords(words.exprs, 'exprs'),
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
  row: MAYBE<EDITOR_CODE_ROW>,
  cursor: number,
  words: GADGET_ZSS_WORDS,
): AUTO_COMPLETE {
  if (!ispresent(row)) {
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
  context: WRITE_TEXT_CONTEXT,
) {
  applystrtoindex(bufindex, text, context)
  for (let c = 0; c < text.length; c++) {
    const wordcolor = zsswordcolor(word.toLowerCase())
    if (!isarray(wordcolor)) {
      const charoffset = textoffset + c
      const ispadding = charoffset === 0 || charoffset > word.length
      const color = ispadding ? fg : wordcolor
      context.color[bufindex + c] = color
      context.bg[bufindex + c] = bg
    }
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
  autocomplete: AUTO_COMPLETE,
  autocompleteindex: number,
  px: number,
  py: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  words: GADGET_ZSS_WORDS,
  drawabove?: boolean,
) {
  if (autocomplete.suggestions.length === 0) {
    return
  }

  const effectiveindex = Math.max(0, autocompleteindex)
  const numrows = autocomplete.suggestions.length
  const maxitemlen = autocomplete.suggestions.reduce(
    (max, s) => Math.max(max, s.word.length),
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
  for (let i = 0; i < autocomplete.suggestions.length; i++) {
    const y = yforindex(i)
    if (y >= edge.bottom || y < minY) {
      continue
    }

    const selected = i === effectiveindex
    const bg = selected ? AC_SEL_BG : AC_BG

    const rowstart = Math.max(px, edge.left)
    const rowend = Math.min(px + itemwidth - 1, edge.right - 1)
    if (rowstart > rowend) {
      continue
    }

    const textoffset = rowstart - px
    const fulltext = ` ${autocomplete.suggestions[i].word} `
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
      autocomplete.suggestions[i].word,
      selected ? AC_SEL_FG : AC_FG,
      bg,
      context,
    )

    if (selected) {
      let hint = ''
      const suggestion = autocomplete.suggestions[i]
      switch (suggestion.category) {
        case 'objects':
          hint = 'object codepage'
          break
        case 'terrains':
          hint = 'terrain codepage'
          break
        case 'boards':
          hint = 'board codepage'
          break
        case 'palettes':
          hint = 'palette codepage'
          break
        case 'charsets':
          hint = 'charset codepage'
          break
        case 'loaders':
          hint = 'loader codepage'
          break
        case 'clicommands':
        case 'loadercommands':
        case 'runtimecommands': {
          const sigs = words[suggestion.category]?.[suggestion.word]
          if (sigs && Array.isArray(sigs)) {
            const seen = new Set<string>()
            for (const sig of sigs) {
              if (!Array.isArray(sig) || sig.length === 0) {
                continue
              }
              const last = sig[sig.length - 1]
              if (typeof last === 'string') {
                const trimmed = last.trim()
                if (trimmed && !seen.has(trimmed)) {
                  seen.add(trimmed)
                }
              }
            }
            if (seen.size > 0) {
              hint = Array.from(seen).join(' | ')
            }
          }
          break
        }
        default: {
          const rompath = `editor:${suggestion.category}:${suggestion.word}`
          const rom = romread(rompath)
          hint = rom
            ? stripRomValue((rom.split('\n')[0] ?? '').replace(/^desc;/, ''))
            : suggestion.category
          break
        }
      }
      if (hint) {
        const hintx = rowstart + text.length
        drawhinttext(hint, hintx, y, edge.right, context)
      }
    }
  }
}
