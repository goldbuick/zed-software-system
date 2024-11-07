import {
  createToken,
  createTokenInstance,
  Lexer,
  IToken,
  TokenType,
  ITokenConfig,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { range } from 'zss/mapping/array'
import { isarray } from 'zss/mapping/types'

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

function createSimpleToken(config: ITokenConfig) {
  return createToken({
    ...config,
    name: `token_${config.name}`,
  })
}

function createWordToken(word: string, skipped = false) {
  if (skipped) {
    return createSimpleToken({
      name: word,
      pattern: new RegExp(word.toLowerCase(), 'i'),
      longer_alt: stringliteral,
      group: Lexer.SKIPPED,
    })
  }
  return createSimpleToken({
    name: word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
    longer_alt: stringliteral,
  })
}

// Newline & Whitespace

export const newline = createSimpleToken({
  name: 'newline',
  line_breaks: true,
  start_chars_hint: ['\n', '\r'],
  pattern: /\n|\r\n?/,
})

export const whitespace = createSimpleToken({
  name: 'whitespace',
  pattern: / +/,
  group: Lexer.SKIPPED,
})

export const whitespaceandnewline = createSimpleToken({
  name: 'whitespace',
  pattern: /\s+/,
  line_breaks: true,
  group: Lexer.SKIPPED,
})

export const stat = createSimpleToken({
  name: 'stat',
  pattern: /@.*/,
  start_chars_hint: ['@'],
})

export const command = createSimpleToken({
  name: 'command',
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
  if (lastMatched && lastMatched.tokenType !== newline) {
    return null
  }

  // scan beginning of line whitespace
  let cursor = startOffset
  while (text[cursor] === ' ') {
    cursor++
  }

  // detect beginning of text
  if (`@#/?':!"`.includes(text[cursor])) {
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

export const text = createSimpleToken({
  name: 'text',
  pattern: matchBasicText,
  line_breaks: false,
  start_chars_hint: all_chars.filter((ch) => `@#/?':!`.includes(ch) === false),
})

export const comment = createSimpleToken({
  name: 'comment',
  pattern: /'.*/,
  start_chars_hint: [`'`],
})

export const label = createSimpleToken({
  name: 'label',
  pattern: /:[^;:\n]*/,
  start_chars_hint: [':'],
})

export const hyperlink = createSimpleToken({
  name: 'hyperlink',
  pattern: /!/,
  start_chars_hint: ['!'],
})

export const hyperlinktext = createSimpleToken({
  name: 'hyperlinktext',
  pattern: /;[^;\n]*/,
  start_chars_hint: [';'],
})

export const stringliteral = createSimpleToken({
  name: 'stringliteral',
  pattern: /[^-0-9"!;@#/?\s]+[^-"!;@#/?\s]*/,
  start_chars_hint: all_chars,
})

export const stringliteraldouble = createSimpleToken({
  name: 'stringliteraldouble',
  pattern: /"(?:[^\\"]|\\(?:[^\n\r]|u[0-9a-fA-F]{4}))*"/,
})

export const numberliteral = createSimpleToken({
  name: 'numberliteral',
  pattern: /-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
})

// comparision

export const iseq = createSimpleToken({
  name: 'iseq',
  pattern: /=|is|eq|equal/,
  longer_alt: stringliteral,
})
export const isnoteq = createSimpleToken({
  name: 'isnoteq',
  pattern: /!=|not ?eq|not ?equal/,
  longer_alt: stringliteral,
})
export const islessthan = createSimpleToken({
  name: 'islessthan',
  pattern: /<|below/,
  longer_alt: stringliteral,
})
export const isgreaterthan = createSimpleToken({
  name: 'isgreaterthan',
  pattern: />|above/,
  longer_alt: stringliteral,
})
export const islessthanorequal = createSimpleToken({
  name: 'islessthanorequal',
  pattern: /<=|below ?or ?eq|below ?or ?equal/,
  longer_alt: stringliteral,
})
export const isgreaterthanorequal = createSimpleToken({
  name: 'isgreaterthanorequal',
  pattern: />=|above ?or ?eq|above ?or ?equal/,
  longer_alt: stringliteral,
})

// logical

export const or = createSimpleToken({
  name: 'or',
  pattern: /or/i,
  longer_alt: stringliteral,
})
export const not = createSimpleToken({
  name: 'not',
  pattern: /not/i,
  longer_alt: stringliteral,
})
export const and = createSimpleToken({
  name: 'and',
  pattern: /and/i,
  longer_alt: stringliteral,
})

// math ops

export const plus = createSimpleToken({ name: 'plus', pattern: /\+/ })
export const minus = createSimpleToken({ name: 'minus', pattern: /-/ })
export const power = createSimpleToken({ name: 'power', pattern: /\*\*/ })
export const multiply = createSimpleToken({ name: 'multiply', pattern: /\*/ })
export const divide = createSimpleToken({ name: 'divide', pattern: /\// })
export const moddivide = createSimpleToken({ name: 'moddivide', pattern: /%/ })
export const floordivide = createSimpleToken({
  name: 'floordivide',
  pattern: /%%/,
})
export const query = createSimpleToken({ name: 'query', pattern: /\?/ })

// grouping

export const lparen = createSimpleToken({
  name: 'lparen',
  pattern: /\(/,
  push_mode: 'ignore_newlines',
})
export const rparen = createSimpleToken({
  name: 'rparen',
  pattern: /\)/,
  pop_mode: true,
})

// media command

export const command_play = createSimpleToken({
  name: 'command_play',
  pattern: /play .*/,
  start_chars_hint: all_chars,
  longer_alt: stringliteral,
})

// core / structure commands

export const command_if = createWordToken('if')
export const command_do = createWordToken('do')
export const command_to = createWordToken('to', true)
export const command_done = createWordToken('done')
export const command_then = createWordToken('then', true)
export const command_else = createWordToken('else')
export const command_while = createWordToken('while')
export const command_repeat = createWordToken('repeat')
export const command_waitfor = createWordToken('waitfor')
export const command_foreach = createSimpleToken({
  name: 'foreach',
  pattern: /for|foreach/,
  longer_alt: stringliteral,
})
export const command_break = createWordToken('break')
export const command_continue = createWordToken('continue')

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
    numberliteral,
    // expressions
    iseq,
    isnoteq,
    islessthanorequal,
    islessthan,
    isgreaterthanorequal,
    isgreaterthan,
    // logical
    or,
    not,
    and,
    // math ops
    plus,
    minus,
    power,
    multiply,
    divide,
    floordivide,
    moddivide,
    query,
    // grouping
    lparen,
    rparen,
    // content
    stringliteraldouble,
    stringliteral,
  ]
}

export const allTokens = createTokenSet([
  // text output
  text,
  // commands
  stat,
  command_play,
  command,
  // flow
  comment,
  label,
  hyperlink,
  hyperlinktext,
  newline,
  whitespace,
  // core / structure commands
  command_if,
  command_done,
  command_do,
  command_to,
  command_then,
  command_else,
  command_while,
  command_repeat,
  command_waitfor,
  command_foreach,
  command_break,
  command_continue,
])

const scriptLexer = new Lexer(
  {
    defaultMode: 'use_newlines',
    modes: {
      use_newlines: allTokens,
      ignore_newlines: createTokenSet([whitespaceandnewline]),
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
        newline,
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
