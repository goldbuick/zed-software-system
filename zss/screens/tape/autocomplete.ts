import type {
  COMMAND_ARGS_SIGNATURE,
  COMMAND_ARG_AUTOCOMPLETE,
} from 'zss/firmware'
import { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import * as lexer from 'zss/lang/lexer'
import { MAYBE, isarray, ispresent, isstring } from 'zss/mapping/types'
import { romread } from 'zss/rom'
import { romhintfrommarkdown } from 'zss/rom/romhint'
import {
  WRITE_TEXT_CONTEXT,
  applycolortoindexes,
  applystrtoindex,
  textformatreadedges,
} from 'zss/words/textformat'
import { ARG_TYPE, COLOR, NAME } from 'zss/words/types'

import { type ZSS_WORD_LIST_KEY, zsswordcolor } from './colors'
import { EDITOR_CODE_ROW } from './common'

const WORD_LIST_KEYS: ZSS_WORD_LIST_KEY[] = [
  'flags',
  'objects',
  'terrains',
  'boards',
  'palettes',
  'charsets',
  'loaders',
  'categories',
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
  /** Max `word.length` among suggestions; 0 when none. */
  maxsuggestionwordlen: number
  /** Lowercase command name after `#` for `editor:commands:` ROM lookup. */
  hintcommandname: string
}

export const EMPTY_AUTOCOMPLETE: AUTO_COMPLETE = {
  suggestions: [],
  prefix: '',
  wordcol: 0,
  wordstart: 0,
  endoflinehint: false,
  endoflineargs: [''],
  maxsuggestionwordlen: 0,
  hintcommandname: '',
}

const MAX_SUGGESTIONS = 8

function maxsuggestionwordlength(
  suggestions: AUTO_COMPLETE_SUGGESTION[],
): number {
  let m = 0
  for (const s of suggestions) {
    if (s.word.length > m) {
      m = s.word.length
    }
  }
  return m
}

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

/** Resolve declared keyword list for `#cmd` argument position (exported for tests). */
export function keywordsforcommandargcomplete(
  meta: COMMAND_ARG_AUTOCOMPLETE | undefined,
  argindex: number,
  firstarglower: string,
): string[] | undefined {
  if (!meta) {
    return undefined
  }
  if (argindex > 0 && firstarglower) {
    const variant = meta.whenfirst?.[firstarglower]?.[argindex]
    if (variant?.length) {
      return variant
    }
  }
  const bypos = meta.byposition?.[argindex]
  if (bypos?.length) {
    return bypos
  }
  return undefined
}

function commandargsnumeric(sig: COMMAND_ARGS_SIGNATURE): ARG_TYPE[] {
  const out: ARG_TYPE[] = []
  for (let i = 0; i < sig.length; i++) {
    const x = sig[i]
    if (typeof x === 'number') {
      out.push(x)
    }
  }
  return out
}

function alldefaultsuggestionitems(
  words: GADGET_ZSS_WORDS,
): AUTO_COMPLETE_SUGGESTION[] {
  return [
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
    ...tagwords(words.categories, 'categories'),
    ...tagwords(words.colors, 'colors'),
    ...tagwords(words.dirs, 'dirs'),
    ...tagwords(words.dirmods, 'dirmods'),
    ...tagwords(words.exprs, 'exprs'),
  ]
}

function itemsforargtype(
  words: GADGET_ZSS_WORDS,
  t: ARG_TYPE,
): AUTO_COMPLETE_SUGGESTION[] {
  switch (t) {
    case ARG_TYPE.COLOR:
    case ARG_TYPE.COLOR_OR_KIND:
      return tagwords(words.colors, 'colors')
    case ARG_TYPE.DIR:
      return [
        ...tagwords(words.dirs, 'dirs'),
        ...tagwords(words.dirmods, 'dirmods'),
      ]
    case ARG_TYPE.KIND:
    case ARG_TYPE.MAYBE_KIND:
      return tagwords(words.categories, 'categories')
    case ARG_TYPE.ANY:
    case ARG_TYPE.NUMBER:
    case ARG_TYPE.MAYBE_NUMBER:
    case ARG_TYPE.NAME:
    case ARG_TYPE.MAYBE_NAME:
    case ARG_TYPE.NUMBER_OR_NAME:
    case ARG_TYPE.MAYBE_NUMBER_OR_NAME:
    case ARG_TYPE.STRING:
    case ARG_TYPE.MAYBE_STRING:
    case ARG_TYPE.NUMBER_OR_STRING:
    case ARG_TYPE.MAYBE_NUMBER_OR_STRING:
      return []
    default:
      return alldefaultsuggestionitems(words)
  }
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
    const maybecommand = cmdidx >= 0 ? (tokens[cmdidx + 1]?.image ?? '') : ''
    const hintcommandname =
      cmdidx >= 0 && maybecommand !== '' ? NAME(maybecommand).toLowerCase() : ''
    const cmdlookup = maybecommand.toLowerCase()
    const maybesig =
      words.langcommands[cmdlookup] ??
      words.clicommands[cmdlookup] ??
      words.loadercommands[cmdlookup] ??
      words.runtimecommands[cmdlookup]

    let endoflineargs = ispresent(maybesig)
      ? maybesig
      : ([`send the message ${maybecommand}`] as COMMAND_ARGS_SIGNATURE)

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
          maxsuggestionwordlen: maxsuggestionwordlength(suggestions),
          hintcommandname,
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
          maxsuggestionwordlen: 0,
          hintcommandname: '',
        }
      }
      default: {
        let items: AUTO_COMPLETE_SUGGESTION[]
        if (cmdidx >= 0 && activetokenidx >= cmdidx + 2) {
          const argindex = activetokenidx - cmdidx - 2
          const meta = words.commandargmeta?.[hintcommandname]
          let firstlower = ''
          if (argindex > 0 && cmdidx + 2 < tokens.length) {
            firstlower = NAME(tokens[cmdidx + 2]?.image ?? '').toLowerCase()
          }
          const sub = keywordsforcommandargcomplete(meta, argindex, firstlower)
          if (ispresent(sub) && sub.length > 0) {
            items = tagwords(sub, 'commandargmeta')
          } else {
            const types = maybesig ? commandargsnumeric(maybesig) : []
            const t = types[argindex]
            if (ispresent(t)) {
              items = itemsforargtype(words, t)
            } else {
              items = alldefaultsuggestionitems(words)
            }
          }
        } else {
          items = alldefaultsuggestionitems(words)
        }
        const suggestions = filtersuggestions(prefix, items)
        return {
          suggestions,
          prefix,
          wordcol,
          wordstart,
          endoflinehint,
          endoflineargs,
          maxsuggestionwordlen: maxsuggestionwordlength(suggestions),
          hintcommandname,
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
  wordlistcolors: Map<string, COLOR>,
) {
  applystrtoindex(bufindex, text, context)
  for (let c = 0; c < text.length; c++) {
    const wordcolor = zsswordcolor(word.toLowerCase(), wordlistcolors)
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

function argsliststring(args: ARG_TYPE[]) {
  const list = []
  for (const arg of args) {
    switch (arg) {
      case ARG_TYPE.COLOR:
        list.push('<color>')
        break
      case ARG_TYPE.KIND:
        list.push('<kind>')
        break
      case ARG_TYPE.DIR:
        list.push('<dir>')
        break
      case ARG_TYPE.NAME:
        list.push('<name>')
        break
      case ARG_TYPE.NUMBER:
        list.push('<number>')
        break
      case ARG_TYPE.STRING:
        list.push('<string>')
        break
      case ARG_TYPE.NUMBER_OR_STRING:
        list.push('<num|str>')
        break
      case ARG_TYPE.COLOR_OR_KIND:
        list.push('<color|kind>')
        break
      case ARG_TYPE.MAYBE_KIND:
        list.push('[kind]')
        break
      case ARG_TYPE.MAYBE_NAME:
        list.push('[name]')
        break
      case ARG_TYPE.MAYBE_NUMBER:
        list.push('[number]')
        break
      case ARG_TYPE.MAYBE_STRING:
        list.push('[string]')
        break
      case ARG_TYPE.MAYBE_NUMBER_OR_STRING:
        list.push('[num|str]')
        break
      case ARG_TYPE.ANY:
        list.push('<any>')
        break
    }
  }
  return list.join(' ')
}

export type DrawCommandArgHintOptions = {
  /** Extra prose from `editor:commands:<name>` ROM when present. */
  romhint?: string
}

/**
 * Draws the argument hint for a command (e.g. above the terminal input).
 * Uses the trailing hint string from the command's single signature.
 */
export function drawcommandarghint(
  sig: COMMAND_ARGS_SIGNATURE,
  px: number,
  py: number,
  edge: AutocompleteEdge,
  context: WRITE_TEXT_CONTEXT,
  options?: DrawCommandArgHintOptions,
) {
  const withsig = [...sig]
  const hint = withsig.pop()
  if (!isstring(hint)) {
    return
  }
  let cursor = px
  const argsStr = argsliststring(withsig as ARG_TYPE[])
  if (argsStr) {
    drawhinttext(argsStr, cursor, py, edge.right, context)
    cursor += argsStr.length + 1
  }
  drawhinttext(hint, cursor, py, edge.right, context)
  const hintlen = Math.min(hint.length, Math.max(0, edge.right - cursor + 1))
  cursor += hintlen > 0 ? hintlen + 1 : 0
  const rom = options?.romhint?.trim()
  if (rom && cursor <= edge.right) {
    drawhinttext(` ${rom}`, cursor, py, edge.right, context)
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
  wordlistcolors: Map<string, COLOR>,
  drawabove?: boolean,
) {
  if (autocomplete.suggestions.length === 0) {
    return
  }

  const effectiveindex = Math.max(0, autocompleteindex)
  const numrows = autocomplete.suggestions.length
  const maxitemlen =
    autocomplete.maxsuggestionwordlen > 0
      ? autocomplete.maxsuggestionwordlen
      : autocomplete.suggestions.reduce(
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
      wordlistcolors,
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
          const wk = suggestion.word.toLowerCase()
          const sig =
            words.langcommands[wk] ??
            words.clicommands[wk] ??
            words.loadercommands[wk] ??
            words.runtimecommands[wk]
          if (isarray(sig)) {
            const args = [...sig] as ARG_TYPE[]
            const cmd = args.pop()
            hint = `${argsliststring(args)} ${cmd}`
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
