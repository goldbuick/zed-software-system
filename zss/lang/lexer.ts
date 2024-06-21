import {
  createToken,
  createTokenInstance,
  Lexer,
  IToken,
  TokenType,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { range } from 'zss/mapping/array'
import { isarray } from 'zss/mapping/types'

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

// Newline & Whitespace

export const Newline = createToken({
  name: 'Newline',
  line_breaks: true,
  start_chars_hint: ['\n', '\r'],
  pattern: /\n|\r\n?/,
})

export const Whitespace = createToken({
  name: 'Whitespace',
  pattern: / +/,
  group: Lexer.SKIPPED,
})

export const WhitespaceAndNewline = createToken({
  name: 'Whitespace',
  pattern: /\s+/,
  line_breaks: true,
  group: Lexer.SKIPPED,
})

export const Stat = createToken({
  name: 'Stat',
  pattern: /@.*/,
  start_chars_hint: ['@'],
})

export const Command = createToken({
  name: 'Command',
  pattern: /#/,
  start_chars_hint: ['#'],
})

let matchTextEnabled = false

function matchBasicText(text: string, startOffset: number, matched: IToken[]) {
  if (!matchTextEnabled) {
    return null
  }

  const [lastMatched] = matched.slice(-1)

  // check for newline
  if (lastMatched && lastMatched.tokenType !== Newline) {
    return null
  }

  // scan beginning of line whitespace
  let cursor = startOffset
  while (text[cursor] === ' ') {
    cursor++
  }

  // detect beginning of text
  if (`@#/?':!`.includes(text[cursor])) {
    return null
  }

  // scan until EOL
  let i = startOffset + 1
  while (i < text.length && text[i] !== '\n') {
    i++
  }

  // return match
  const match = text.substring(startOffset, i)
  return [match] as RegExpExecArray
}

export const Text = createToken({
  name: 'Text',
  pattern: matchBasicText,
  line_breaks: false,
  start_chars_hint: all_chars.filter((ch) => `@#/?':!`.includes(ch) === false),
})

export const Comment = createToken({
  name: 'Comment',
  pattern: /'.*/,
  start_chars_hint: [`'`],
})

export const Label = createToken({
  name: 'Label',
  pattern: /:[^;:\n]*/,
  start_chars_hint: [':'],
})

export const HyperLink = createToken({
  name: 'HyperLink',
  pattern: /!/,
  start_chars_hint: ['!'],
})

export const HyperLinkText = createToken({
  name: 'HyperLinkText',
  pattern: /;[^;\n]*/,
  start_chars_hint: [';'],
})

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /[^-0-9"!;@#/?\s]+[^-"!;@#/?\s]*/,
  start_chars_hint: all_chars,
})

export const StringLiteralDouble = createToken({
  name: 'StringLiteralDouble',
  pattern: /"(?:[^\\"]|\\(?:[^\n\r]|u[0-9a-fA-F]{4}))*"/,
})

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
})

function createWordToken(word: string, skipped = false) {
  return createToken({
    name: word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
    longer_alt: StringLiteral,
    group: skipped ? Lexer.SKIPPED : undefined,
  })
}

// comparision

export const IsEq = createToken({
  name: 'IsEq',
  pattern: /=|is|eq|equal/,
  longer_alt: StringLiteral,
})
export const IsNotEq = createToken({
  name: 'IsNotEq',
  pattern: /!=|not ?eq|not ?equal/,
  longer_alt: StringLiteral,
})
export const IsLessThan = createToken({
  name: 'IsLessThan',
  pattern: /<|below/,
  longer_alt: StringLiteral,
})
export const IsGreaterThan = createToken({
  name: 'IsGreaterThan',
  pattern: />|above/,
  longer_alt: StringLiteral,
})
export const IsLessThanOrEqual = createToken({
  name: 'IsLessThanOrEqual',
  pattern: /<=|below ?or ?eq|below ?or ?equal/,
  longer_alt: StringLiteral,
})
export const IsGreaterThanOrEqual = createToken({
  name: 'IsGreaterThanOrEqual',
  pattern: />=|above ?or ?eq|above ?or ?equal/,
  longer_alt: StringLiteral,
})

// logical

export const Or = createToken({
  name: 'Or',
  pattern: /or/i,
  longer_alt: StringLiteral,
})
export const Not = createToken({
  name: 'Not',
  pattern: /not/i,
  longer_alt: StringLiteral,
})
export const And = createToken({
  name: 'And',
  pattern: /and/i,
  longer_alt: StringLiteral,
})

// math ops

export const Plus = createToken({ name: 'Plus', pattern: /\+/ })
export const Minus = createToken({ name: 'Minus', pattern: /-/ })
export const Power = createToken({ name: 'Power', pattern: /\*\*/ })
export const Multiply = createToken({ name: 'Multiply', pattern: /\*/ })
export const Divide = createToken({ name: 'Divide', pattern: /\// })
export const ModDivide = createToken({ name: 'ModDivide', pattern: /%/ })
export const FloorDivide = createToken({ name: 'FloorDivide', pattern: /%%/ })
export const Query = createToken({ name: 'Query', pattern: /\?/ })

// grouping

export const LParen = createToken({
  name: 'LParen',
  pattern: /\(/,
  push_mode: 'ignore_newlines',
})
export const RParen = createToken({
  name: 'RParen',
  pattern: /\)/,
  pop_mode: true,
})

// media command

export const Command_play = createToken({
  name: 'play',
  pattern: /play .*/,
  start_chars_hint: all_chars,
  longer_alt: StringLiteral,
})

// core / structure commands

export const Command_if = createWordToken('if')
export const Command_do = createWordToken('do')
export const Command_then = createWordToken('then', true)
export const Command_else = createWordToken('else')
export const Command_endif = createWordToken('endif')
export const Command_while = createWordToken('while')
export const Command_endwhile = createWordToken('endwhile')
export const Command_repeat = createWordToken('repeat')
export const Command_endrepeat = createWordToken('endrepeat')
export const Command_read = createWordToken('read')
export const Command_into = createWordToken('into')
export const Command_endread = createWordToken('endread')
export const Command_break = createWordToken('break')
export const Command_continue = createWordToken('continue')

// common error marking
export type LANG_ERROR = {
  offset: number
  line: number | undefined
  column: number | undefined
  length: number
  message: string
}

function createTokenSet(primary: TokenType[]) {
  return [
    // primary tokens
    ...primary,
    NumberLiteral,
    // expressions
    IsEq,
    IsNotEq,
    IsLessThanOrEqual,
    IsLessThan,
    IsGreaterThanOrEqual,
    IsGreaterThan,
    // logical
    Or,
    Not,
    And,
    // math ops
    Plus,
    Minus,
    Power,
    Multiply,
    Divide,
    FloorDivide,
    ModDivide,
    Query,
    // grouping
    LParen,
    RParen,
    // content
    StringLiteralDouble,
    StringLiteral,
  ]
}

export const allTokens = createTokenSet([
  // text output
  Text,
  // commands
  Stat,
  Command_play,
  Command,
  // flow
  Comment,
  Label,
  HyperLink,
  HyperLinkText,
  Newline,
  Whitespace,
  // core / structure commands
  Command_if,
  Command_do,
  Command_then,
  Command_else,
  Command_endif,
  Command_while,
  Command_endwhile,
  Command_repeat,
  Command_endrepeat,
  Command_read,
  Command_into,
  Command_endread,
  Command_break,
  Command_continue,
])

const scriptLexer = new Lexer(
  {
    defaultMode: 'use_newlines',
    modes: {
      use_newlines: allTokens,
      ignore_newlines: createTokenSet([WhitespaceAndNewline]),
    },
  },
  {
    skipValidations: !LANG_DEV,
    ensureOptimizations: LANG_DEV,
  },
)

export function tokenize(text: string) {
  matchTextEnabled = true
  const lexResult = scriptLexer.tokenize(text || ' \n')

  // add final new line ?
  const [lastToken] = (isarray(lexResult.tokens) ? lexResult.tokens : []).slice(
    -1,
  )
  if (lastToken && lastToken.tokenType.name !== 'Newline') {
    lexResult.tokens.push(
      createTokenInstance(
        Newline,
        '\n',
        lastToken.startOffset,
        lastToken.endOffset ?? NaN,
        lastToken.startLine ?? NaN,
        lastToken.endLine ?? NaN,
        lastToken.startColumn ?? NaN,
        lastToken.endColumn ?? NaN,
      ),
    )
  }

  return lexResult
}
