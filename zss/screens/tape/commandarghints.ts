import type { IToken } from 'chevrotain'
import type { COMMAND_ARGS_SIGNATURE } from 'zss/firmware'
import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import * as lexer from 'zss/lang/lexer'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { romhintfrommarkdown, romread } from 'zss/rom'
import { ARG_TYPE } from 'zss/words/types'

/** Longer help from `zss/rom/editor/commands/<name>.md` when present */
export function commandromhint(commandlookup: string): string {
  if (!commandlookup) {
    return ''
  }
  const rom: MAYBE<string> = romread(`editor:commands:${commandlookup}`)
  if (ispresent(rom)) {
    return romhintfrommarkdown(rom) ?? ''
  }
  return ''
}

export function getcommandargsignature(
  words: GADGET_ZSS_WORDS,
  name: string,
): COMMAND_ARGS_SIGNATURE | undefined {
  const key = name.toLowerCase()
  return (
    words.langcommands[key] ??
    words.clicommands[key] ??
    words.loadercommands[key] ??
    words.runtimecommands[key]
  )
}

export function splitcommandsignature(sig: COMMAND_ARGS_SIGNATURE): {
  argtypes: ARG_TYPE[]
  prosehint: string
} {
  const copy = [...sig]
  const last = copy.pop()
  if (!isstring(last)) {
    return { argtypes: [], prosehint: '' }
  }
  const argtypes = copy.filter((x): x is ARG_TYPE => typeof x === 'number')
  return { argtypes, prosehint: last.trim() }
}

function isvalueargtoken(tok: IToken): boolean {
  const idx = tok.tokenTypeIdx
  return (
    idx === lexer.text.tokenTypeIdx ||
    idx === lexer.stringliteral.tokenTypeIdx ||
    idx === lexer.numberliteral.tokenTypeIdx
  )
}

function newlineidxafter(tokens: IToken[], from: number): number {
  for (let i = from; i < tokens.length; i++) {
    if (tokens[i].tokenTypeIdx === lexer.newline.tokenTypeIdx) {
      return i
    }
  }
  return tokens.length
}

/**
 * 1-based arg group starts after the command name token (value tokens separated
 * by a gap of at least one column).
 */
export function commandarggroupstarts(
  tokens: IToken[],
  cmdidx: number,
): number[] {
  const starts: number[] = []
  const first = cmdidx + 2
  const end = newlineidxafter(tokens, first)
  let prevvalue: IToken | undefined
  for (let i = first; i < end; i++) {
    const t = tokens[i]
    if (!isvalueargtoken(t)) {
      continue
    }
    if (!prevvalue) {
      starts.push(i)
      prevvalue = t
      continue
    }
    const prevend = prevvalue.endColumn ?? prevvalue.startColumn ?? 1
    const gap = (t.startColumn ?? 1) - prevend - 1
    if (gap >= 1) {
      starts.push(i)
    }
    prevvalue = t
  }
  return starts
}

/** Single ARG_TYPE to the same placeholder string as argsliststring (one token). */
export function argtypetoplaceholder(t: ARG_TYPE): string {
  switch (t) {
    case ARG_TYPE.COLOR:
      return '<color>'
    case ARG_TYPE.KIND:
      return '<kind>'
    case ARG_TYPE.DIR:
      return '<dir>'
    case ARG_TYPE.NAME:
      return '<name>'
    case ARG_TYPE.NUMBER_OR_NAME:
      return '<num|name>'
    case ARG_TYPE.NUMBER:
      return '<number>'
    case ARG_TYPE.STRING:
      return '<string>'
    case ARG_TYPE.NUMBER_OR_STRING:
      return '<num|str>'
    case ARG_TYPE.COLOR_OR_KIND:
      return '<color|kind>'
    case ARG_TYPE.MAYBE_KIND:
      return '[kind]'
    case ARG_TYPE.MAYBE_NAME:
      return '[name]'
    case ARG_TYPE.MAYBE_NUMBER_OR_NAME:
      return '[num|name]'
    case ARG_TYPE.MAYBE_NUMBER:
      return '[number]'
    case ARG_TYPE.MAYBE_STRING:
      return '[string]'
    case ARG_TYPE.MAYBE_NUMBER_OR_STRING:
      return '[num|str]'
    case ARG_TYPE.ANY:
      return '<any>'
    default:
      return '<arg>'
  }
}

/**
 * Which positional arg the cursor is in (0-based), after the command name.
 * If still on the command name token, returns 0 (next to fill is first arg).
 */
export function commandargindexatcursor(
  tokens: IToken[],
  cmdidx: number,
  activetokenidx: number,
  cursor1based: number,
): number {
  if (cmdidx < 0) {
    return 0
  }
  const cmdnameidx = cmdidx + 1
  if (activetokenidx <= cmdnameidx) {
    return 0
  }

  const starts = commandarggroupstarts(tokens, cmdidx)
  if (starts.length === 0) {
    return 0
  }

  for (let a = 0; a < starts.length; a++) {
    const t = tokens[starts[a]]
    const startcol = t.startColumn ?? 1
    const nextstart =
      a + 1 < starts.length
        ? (tokens[starts[a + 1]].startColumn ?? 99999)
        : 99999
    if (cursor1based >= startcol && cursor1based < nextstart) {
      return a
    }
  }

  return starts.length
}

export function computecommandnexthint(
  tokens: IToken[],
  cmdidx: number,
  activetokenidx: number,
  cursor1based: number,
  argtypes: ARG_TYPE[],
): string {
  if (argtypes.length === 0) {
    return ''
  }

  const argindex = commandargindexatcursor(
    tokens,
    cmdidx,
    activetokenidx,
    cursor1based,
  )

  if (argindex < argtypes.length) {
    return `next: ${argtypetoplaceholder(argtypes[argindex])}`
  }

  const last = argtypes[argtypes.length - 1]
  if (last === ARG_TYPE.ANY) {
    return 'next: <any>'
  }

  return ''
}

export function issignaturenoargs(sig: COMMAND_ARGS_SIGNATURE): boolean {
  if (sig.length === 1 && sig[0] === '') {
    return true
  }
  const { argtypes, prosehint } = splitcommandsignature(sig)
  return argtypes.length === 0 && prosehint.length === 0
}

export function buildcommandhintbody(
  sig: COMMAND_ARGS_SIGNATURE,
  romprose?: string,
): string {
  if (issignaturenoargs(sig)) {
    return '(no args)'
  }
  const { argtypes, prosehint } = splitcommandsignature(sig)
  const parts = argtypes.map(argtypetoplaceholder).filter(Boolean)
  const argsstr = parts.join(' ')
  const prose = (romprose && romprose.trim().length > 0
    ? romprose.trim()
    : prosehint) ?? ''
  if (argsstr && prose) {
    return `${argsstr} ${prose}`
  }
  return argsstr || prose || '(no args)'
}
