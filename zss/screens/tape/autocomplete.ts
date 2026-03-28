import type { COMMAND_ARGS_SIGNATURE } from 'zss/firmware'
import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import * as lexer from 'zss/lang/lexer'
import { MAYBE, isarray, ispresent } from 'zss/mapping/types'
import { romhintfrommarkdown, romread } from 'zss/rom'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'

import {
  buildcommandhintbody,
  commandromhint,
  computecommandnexthint,
  getcommandargsignature,
  splitcommandsignature,
} from './commandarghints'
import { zsswordcolor } from './colors'
import type { ZSS_WORD_LIST_KEY } from './colors'
import { EDITOR_CODE_ROW } from './common'

const WORD_LIST_KEYS: ZSS_WORD_LIST_KEY[] = [
  'flags',
  'objects',
  'terrains',
  'boards',
  'palettes',
  'charsets',
  'loaders',
  'colors',
  'dirs',
  'dirmods',
  'exprs',
]

/**
 * Builds a map from word (lowercase) to category name using GADGET_ZSS_WORDS.
 * Word lists and command record keys are included. Later categories overwrite
 * if a word appears in multiple.
 */
function buildwordcategorymap(words: GADGET_ZSS_WORDS): Map<string, string> {
  const map = new Map<string, string>()
  for (const key of WORD_LIST_KEYS) {
    const list = words[key]
    if (isarray(list)) {
      for (const w of list) {
        map.set(w.toLowerCase(), key)
      }
    }
  }
  // flatten stats lists
  for (const k of [
    ...words.statsboard,
    ...words.statshelper,
    ...words.statssender,
    ...words.statsinteraction,
    ...words.statsboolean,
    ...words.statsconfig,
  ]) {
    map.set(k.toLowerCase(), 'stats')
  }
  return map
}

export type AUTO_COMPLETE_SUGGESTION = {
  word: string
  category: string
}

export type AUTO_COMPLETE = {
  suggestions: AUTO_COMPLETE_SUGGESTION[]
  prefix: string
  wordcol: number
  wordstart: number
  endoflinehint: boolean
  endoflineargs: COMMAND_ARGS_SIGNATURE
  /** e.g. "next: <dir>" when the command has structured ARG_TYPE slots */
  nexthint: string
  /** Lowercase command name after `#` for `editor:commands:` ROM lookup */
  hintcommandname: string
}

export const EMPTY_AUTOCOMPLETE: AUTO_COMPLETE = {
  suggestions: [],
  prefix: '',
  wordcol: 0,
  wordstart: 0,
  endoflinehint: false,
  endoflineargs: [''],
  nexthint: '',
  hintcommandname: '',
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
  const matches = items
    .filter(({ word }) => {
      const wl = word.toLowerCase()
      if (!seen.has(wl) && wl.startsWith(lower) && wl !== lower) {
        seen.add(wl)
        return true
      }
      return false
    })
    .sort((a, b) => a.word.localeCompare(b.word))
    .slice(0, MAX_SUGGESTIONS)
  return matches
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

function hintfromrom(category: string, word = ''): string {
  const rompath = word ? `editor:${category}:${word}` : `editor:${category}`
  const rom = romread(rompath)
  if (ispresent(rom)) {
    return romhintfrommarkdown(rom) ?? ''
  }
  switch (category) {
    case 'flags':
      return `flag ${word}`
    case 'commands':
      return ''
    default:
      return ''
  }
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
    if (startx <= cursor && tok.tokenTypeIdx !== lexer.newline.tokenTypeIdx) {
      activetokenidx = t
    } else if (startx > cursor) {
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

    const wordcategorymap = buildwordcategorymap(words)

    // get token context
    const token = tokens[activetokenidx]
    const wordcol = (token.startColumn ?? 1) - 1
    const wordstart = row.start + wordcol

    // detect command token to our left and first token after it (command name)
    let cmdidx = -1
    for (let i = activetokenidx - 1; i >= 0; i--) {
      if (tokens[i].tokenTypeIdx === lexer.command.tokenTypeIdx) {
        cmdidx = i
        break
      }
    }

    let endoflinehint = cmdidx >= 0
    const cmdnameidx = cmdidx + 1
    const commandlookup =
      cmdidx >= 0 && cmdnameidx < tokens.length
        ? (tokens[cmdnameidx].image ?? '').toLowerCase()
        : ''
    const maybesig = commandlookup
      ? getcommandargsignature(words, commandlookup)
      : undefined

    let endoflineargs = ispresent(maybesig)
      ? maybesig
      : ([`send the message ${commandlookup}`] as COMMAND_ARGS_SIGNATURE)

    let nexthint = ''
    if (cmdidx >= 0 && ispresent(maybesig)) {
      const { argtypes } = splitcommandsignature(maybesig)
      nexthint = computecommandnexthint(
        tokens,
        cmdidx,
        activetokenidx,
        cursor,
        argtypes,
      )
    }

    let prefix = ''
    let activecategory = ''
    switch (token.tokenTypeIdx) {
      case lexer.command.tokenTypeIdx:
        // skip
        break
      case lexer.stat.tokenTypeIdx:
        activecategory = 'stat'
        break
      case lexer.label.tokenTypeIdx:
        activecategory = 'label'
        break
      case lexer.hyperlink.tokenTypeIdx:
        activecategory = 'hyperlink'
        break
      case lexer.hyperlinktext.tokenTypeIdx:
        activecategory = 'hyperlinktext'
        break
      case lexer.comment.tokenTypeIdx:
        activecategory = 'comment'
        break
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
        activecategory = 'commands'
        prefix = token.image ?? ''
        break
      default:
      case lexer.text.tokenTypeIdx:
      case lexer.stringliteral.tokenTypeIdx:
      case lexer.numberliteral.tokenTypeIdx:
        if (cmdidx >= 0 && activetokenidx === cmdidx + 1) {
          prefix = tokens[cmdidx + 1].image ?? ''
          activecategory = 'commands'
        } else {
          prefix = NAME(token.image).toLowerCase()
          activecategory = wordcategorymap.get(prefix) ?? 'text'
        }
        break
    }

    switch (activecategory) {
      case 'commands': {
        const items = [
          ...tagrecordkeys(words.langcommands, 'commands'),
          ...tagrecordkeys(words.clicommands, 'commands'),
          ...tagrecordkeys(words.loadercommands, 'commands'),
          ...tagrecordkeys(words.runtimecommands, 'commands'),
        ]
        const suggestions = filtersuggestions(prefix, items)
        return {
          suggestions,
          prefix,
          wordcol,
          wordstart,
          endoflinehint,
          endoflineargs,
          nexthint,
          hintcommandname: commandlookup,
        }
      }
      case 'stat':
      case 'label':
      case 'comment':
      case 'hyperlink':
      case 'hyperlinktext': {
        endoflinehint = true
        endoflineargs = [hintfromrom(activecategory)]
        return {
          suggestions: [],
          prefix,
          wordcol,
          wordstart,
          endoflinehint,
          endoflineargs,
          nexthint: '',
          hintcommandname: '',
        }
      }
      default: {
        const items = [
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
        ]
        const suggestions = filtersuggestions(prefix, items)
        return {
          suggestions,
          prefix,
          wordcol,
          wordstart,
          endoflinehint,
          endoflineargs,
          nexthint,
          hintcommandname: commandlookup,
        }
      }
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

/** Below this width, EOL-anchored first line is unreadable — use full-width rows. */
const MIN_HINT_FIRST_COL = 22

/**
 * Take up to maxw chars, preferring a break at the last space so words stay intact.
 */
function wraphinttakeline(remaining: string, maxw: number): [string, string] {
  if (remaining.length <= maxw) {
    return [remaining, '']
  }
  const slice = remaining.substring(0, maxw)
  const lastsp = slice.lastIndexOf(' ')
  if (lastsp > maxw * 0.35 && lastsp >= 4) {
    const line = remaining.substring(0, lastsp).trimEnd()
    return [line, remaining.substring(lastsp + 1).trimStart()]
  }
  return [slice, remaining.substring(maxw).trimStart()]
}

function wraphintlines(
  text: string,
  firstpx: number,
  edge: AutocompleteEdge,
): string[] {
  const lines: string[] = []
  let remaining = text.trim()
  if (!remaining.length) {
    return []
  }

  const firstmax = Math.max(0, edge.right - firstpx + 1)
  const narrowfirst = firstmax < MIN_HINT_FIRST_COL
  let first = true

  while (remaining.length > 0) {
    const usefullrow = first && narrowfirst
    const px = usefullrow ? edge.left : first ? firstpx : edge.left
    const maxw = Math.max(0, edge.right - px + 1)
    if (maxw < 1) {
      break
    }
    const [line, rest] = wraphinttakeline(remaining, maxw)
    if (!line.length && rest.length) {
      lines.push(remaining.substring(0, 1))
      remaining = remaining.substring(1).trimStart()
      first = false
      continue
    }
    lines.push(line)
    remaining = rest
    first = false
  }
  return lines
}

export type DrawCommandArgHintOptions = {
  nexthint?: string
  /** First line at px; continuation lines start at edge.left, rows above py */
  wrap?: boolean
  romhint?: string
}

/**
 * Draws the argument hint for a command (e.g. above the terminal input).
 * Uses ARG_TYPE placeholders plus trailing prose (firmware or ROM).
 */
export function drawcommandarghint(
  sig: COMMAND_ARGS_SIGNATURE,
  px: number,
  py: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  options?: DrawCommandArgHintOptions,
) {
  const body = buildcommandhintbody(sig, options?.romhint)
  const next = options?.nexthint?.trim() ?? ''
  const firststripw =
    options?.wrap === true
      ? Math.max(0, edge.right - px + 1)
      : Number.POSITIVE_INFINITY
  const narrowfirst =
    options?.wrap === true && firststripw < MIN_HINT_FIRST_COL
  const full =
    next && narrowfirst
      ? `${next}  ${body}`
      : next
        ? `${body}  ${next}`
        : body
  if (!full) {
    return
  }
  if (options?.wrap) {
    const lines = wraphintlines(full, px, edge)
    let y = py
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const usepx = i === 0 ? px : edge.left
      drawhinttext(line, usepx, y, edge.right, context)
      y -= 1
      if (y < edge.top) {
        break
      }
    }
  } else {
    drawhinttext(full, px, py, edge.right, context)
  }
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
        case 'commands': {
          const sig = getcommandargsignature(words, suggestion.word)
          if (isarray(sig)) {
            hint = buildcommandhintbody(
              sig,
              commandromhint(suggestion.word.toLowerCase()),
            )
          }
          break
        }
        default:
          hint = hintfromrom(suggestion.category, suggestion.word)
          break
      }
      if (hint) {
        const hintx = rowstart + text.length
        drawhinttext(hint, hintx, y, edge.right, context)
      }
    }
  }
}
