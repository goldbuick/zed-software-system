/**
 * ZZT-OOP lexer (vanilla ZZT 3.2), modeled on RoZZT OOP.PAS `OopExecute`.
 *
 * Two lexer modes mirror the OOP execution model:
 * - `lines` mode classifies each line by its first meaningful character, just
 *   as `OopExecute` dispatches on the first char it reads.
 * - `cmd` mode is the `OopReadWord` argument stream entered after `#`, `/`, or
 *   `?`. Whitespace separates words; a newline ends the command line.
 *
 * Line classification reuses `zztlineclass` so stat-vs-text and command-vs-text
 * decisions stay consistent with the rest of the system.
 */
import { IToken, ITokenConfig, Lexer, TokenType, createToken } from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import {
  iscommandat,
  linestartoffset,
  shouldstatat,
} from 'zss/feature/lang/zztlineclass'

export type LANG_ERROR = {
  message: string
  offset: number
  line: number | undefined
  column: number | undefined
  length: number
}

function token(config: ITokenConfig): TokenType {
  return createToken({ ...config, name: `zztoop_${config.name}` })
}

// any whitespace the lexer skips before a line's first meaningful token; must
// match the `whitespace` token class below (all whitespace except \n / \r)
const LEADING_WS = /[^\S\n\r]/

function isfirstnonspace(text: string, offset: number): boolean {
  const start = linestartoffset(text, offset)
  for (let i = start; i < offset; ++i) {
    if (!LEADING_WS.test(text[i])) {
      return false
    }
  }
  return true
}

function lineend(text: string, offset: number): number {
  let i = offset
  while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
    i += 1
  }
  return i
}

// --- line mode tokens ---------------------------------------------------------

export const newline = token({
  name: 'newline',
  line_breaks: true,
  start_chars_hint: ['\n', '\r'],
  pattern: /\n|\r\n?/,
})

// command line terminator: same shape, but pops back to line mode
export const endline = token({
  name: 'endline',
  line_breaks: true,
  start_chars_hint: ['\n', '\r'],
  pattern: /\n|\r\n?/,
  pop_mode: true,
})

export const whitespace = token({
  name: 'whitespace',
  pattern: /[^\S\n\r]+/,
  group: Lexer.SKIPPED,
})

function matchcomment(text: string, offset: number): RegExpExecArray | null {
  if (text[offset] !== `'`) {
    return null
  }
  if (!isfirstnonspace(text, offset)) {
    return null
  }
  return [text.slice(offset, lineend(text, offset))] as RegExpExecArray
}

export const comment = token({
  name: 'comment',
  pattern: matchcomment,
  line_breaks: false,
  start_chars_hint: [`'`],
})

function matchstat(text: string, offset: number): RegExpExecArray | null {
  if (!shouldstatat(text, offset)) {
    return null
  }
  return [text.slice(offset, lineend(text, offset))] as RegExpExecArray
}

export const stat = token({
  name: 'stat',
  pattern: matchstat,
  line_breaks: false,
  start_chars_hint: ['@'],
})

function matchhyperlink(text: string, offset: number): RegExpExecArray | null {
  if (text[offset] !== '!') {
    return null
  }
  if (!isfirstnonspace(text, offset)) {
    return null
  }
  const end = lineend(text, offset)
  const line = text.slice(offset, end)
  // a hyperlink requires a `;` separator; otherwise it is scroll text
  if (!line.includes(';')) {
    return null
  }
  return [line] as RegExpExecArray
}

export const hyperlink = token({
  name: 'hyperlink',
  pattern: matchhyperlink,
  line_breaks: false,
  start_chars_hint: ['!'],
})

function matchlabel(text: string, offset: number): RegExpExecArray | null {
  if (text[offset] !== ':') {
    return null
  }
  if (!isfirstnonspace(text, offset)) {
    return null
  }
  return [text.slice(offset, lineend(text, offset))] as RegExpExecArray
}

export const label = token({
  name: 'label',
  pattern: matchlabel,
  line_breaks: false,
  start_chars_hint: [':'],
})

function matchcommand(text: string, offset: number): RegExpExecArray | null {
  if (!iscommandat(text, offset)) {
    return null
  }
  return ['#'] as RegExpExecArray
}

export const command = token({
  name: 'command',
  pattern: matchcommand,
  line_breaks: false,
  start_chars_hint: ['#'],
  push_mode: 'cmd',
})

function matchmove(
  text: string,
  offset: number,
  char: string,
): RegExpExecArray | null {
  if (text[offset] !== char) {
    return null
  }
  if (!isfirstnonspace(text, offset)) {
    return null
  }
  return [char] as RegExpExecArray
}

export const divide = token({
  name: 'divide',
  pattern: (text, offset) => matchmove(text, offset, '/'),
  line_breaks: false,
  start_chars_hint: ['/'],
  push_mode: 'cmd',
})

export const query = token({
  name: 'query',
  pattern: (text, offset) => matchmove(text, offset, '?'),
  line_breaks: false,
  start_chars_hint: ['?'],
  push_mode: 'cmd',
})

// mid-line movement delimiters inside cmd mode: ZZT's OopReadWord terminates a
// direction word at the next `/` or `?`, so chained `?n?n` / `/n/n` start new
// moves. These must NOT push another cmd mode (we are already in cmd) or the
// `endline` pop would desync.
function matchcmdmove(
  text: string,
  offset: number,
  char: string,
): RegExpExecArray | null {
  if (text[offset] !== char) {
    return null
  }
  return [char] as RegExpExecArray
}

export const divcmd = token({
  name: 'divcmd',
  pattern: (text, offset) => matchcmdmove(text, offset, '/'),
  line_breaks: false,
  start_chars_hint: ['/'],
})

export const querycmd = token({
  name: 'querycmd',
  pattern: (text, offset) => matchcmdmove(text, offset, '?'),
  line_breaks: false,
  start_chars_hint: ['?'],
})

// inline `#` inside cmd mode: in ZZT a move sets stopRunning and resumes at the
// next char, so `?n#send label` runs `#send` on the following tick (same as
// putting it on the next line). `OopReadWord` also stops a word at `#`. We
// surface `#` as its own cmd-mode token so the parser can start a command after
// a move; it does NOT push a mode (we are already in cmd).
export const hashcmd = token({
  name: 'hashcmd',
  pattern: (text, offset) => matchcmdmove(text, offset, '#'),
  line_breaks: false,
  start_chars_hint: ['#'],
})

function matchtext(text: string, offset: number): RegExpExecArray | null {
  if (!isfirstnonspace(text, offset)) {
    return null
  }
  const match = text.slice(offset, lineend(text, offset))
  if (match.trim().length === 0) {
    return null
  }
  return [match] as RegExpExecArray
}

export const text = token({
  name: 'text',
  pattern: matchtext,
  line_breaks: false,
})

// --- command mode tokens ------------------------------------------------------

// one whitespace-delimited word in the OopReadWord argument stream. Stops at
// the statement delimiters `?` / `/` / `#` (matching OopReadWord's terminators)
// so chained shorthand moves and an inline command after a move split into
// separate tokens; other arg chars stay (firmware resolves them).
export const argrun = token({
  name: 'argrun',
  pattern: /[^\s?/#]+/,
  line_breaks: false,
})

const linetokens: TokenType[] = [
  newline,
  whitespace,
  comment,
  stat,
  hyperlink,
  command,
  divide,
  query,
  label,
  text,
]

const cmdtokens: TokenType[] = [
  endline,
  whitespace,
  divcmd,
  querycmd,
  hashcmd,
  argrun,
]

export const zztooplexer = new Lexer(
  {
    modes: {
      lines: linetokens,
      cmd: cmdtokens,
    },
    defaultMode: 'lines',
  },
  { ensureOptimizations: false, skipValidations: !LANG_DEV },
)

export const alltokens: TokenType[] = [
  newline,
  endline,
  whitespace,
  comment,
  stat,
  hyperlink,
  command,
  divide,
  query,
  divcmd,
  querycmd,
  hashcmd,
  label,
  text,
  argrun,
]

export function tokenize(source: string): {
  errors: LANG_ERROR[]
  tokens: IToken[]
} {
  const result = zztooplexer.tokenize(`${source}\n`)
  return {
    errors: result.errors.map((error) => ({
      message: error.message,
      offset: error.offset,
      line: error.line,
      column: error.column,
      length: error.length,
    })),
    tokens: result.tokens,
  }
}
