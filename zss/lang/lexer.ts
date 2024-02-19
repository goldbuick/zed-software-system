import {
  createToken,
  createTokenInstance,
  Lexer,
  IToken,
  TokenType,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { range } from 'zss/mapping/array'

// State required for matching the indentations
let indentStack = [0]

function last<T>(arr: T[] | undefined) {
  if (Array.isArray(arr)) {
    return arr.slice(-1)[0]
  }
  return undefined
}

const indentRegExp = / +/y

function measureIndent(
  text: string,
  offset: number,
  matchedTokens: IToken[],
): [number, RegExpExecArray | null] {
  // no prior tokens, no match
  if (matchedTokens.length === 0) {
    return [-1, null]
  }

  // only match at beginning of line
  const lastToken = last(matchedTokens)
  if (lastToken?.tokenType !== Newline) {
    return [-1, null]
  }

  // there should be no gap between lastToken and offset
  if (lastToken.endOffset === undefined || lastToken.endOffset !== offset - 1) {
    return [-1, null]
  }

  // measure indent
  indentRegExp.lastIndex = offset
  const match = indentRegExp.exec(text)
  const indentLevel = match?.[0].length ?? 0
  const lineStart = text[offset + indentLevel]

  // lines composed of only spaces are ignored
  if (lineStart === '\n') {
    return [-1, null]
  }

  // basic text is always indentLevel 0
  if (`@#/?':!|`.includes(lineStart) === false) {
    return [0, null]
  }

  // return measured indentation
  return [indentLevel, match]
}

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

// indentation & Newline
export const Indent = createToken({
  name: 'Indent',
  line_breaks: false,
  pattern: function (text: string, offset: number, matchedTokens: IToken[]) {
    // measure indent
    const [currIndentLevel] = measureIndent(text, offset, matchedTokens)
    if (currIndentLevel < 0) {
      return null
    }

    // deeper indentation
    const prevIndentLevel = last(indentStack) ?? 0
    if (currIndentLevel > prevIndentLevel) {
      indentStack.push(currIndentLevel)
      // return indent match
      return ['>'.repeat(currIndentLevel)] as RegExpExecArray
    }

    return null
  },
  start_chars_hint: all_chars,
})

export const Outdent = createToken({
  name: 'Outdent',
  line_breaks: false,
  pattern: function (text: string, offset: number, matchedTokens: IToken[]) {
    // measure indent
    const [currIndentLevel, match] = measureIndent(text, offset, matchedTokens)
    if (currIndentLevel < 0) {
      return null
    }

    // shallower indentation
    const prevIndentLevel = last(indentStack) ?? 0
    if (currIndentLevel < prevIndentLevel) {
      const lastToken = last(matchedTokens)
      const matchIndentIndex = indentStack.findLastIndex(
        (depth) => depth === currIndentLevel,
      )

      // any outdent must match some previous indentation level.
      if (matchIndentIndex === -1) {
        // how do we show an error here ???
        return null //throw Error(`invalid outdent at offset: ${offset}`)
      }

      // how many steps down
      const numberOfDedents = indentStack.length - matchIndentIndex - 1

      // This is a little tricky
      // 1. If there is no match (0 level indent) than this custom token
      //    matcher would return "null" and so we need to add all the required outdents ourselves.
      // 2. If there was match (> 0 level indent) than we need to add minus one number of outdents
      //    because the lexer would create one due to returning a none null result.

      const startOffset = match !== null ? 1 : 0
      for (let i = startOffset; i < numberOfDedents; i++) {
        const depth = indentStack.pop() ?? 0
        matchedTokens.push(
          createTokenInstance(
            Outdent,
            '<'.repeat(depth),
            lastToken?.startOffset ?? NaN,
            lastToken?.endOffset ?? NaN,
            lastToken?.startLine ?? NaN,
            lastToken?.endLine ?? NaN,
            lastToken?.startColumn ?? NaN,
            lastToken?.endColumn ?? NaN,
          ),
          // newline always follows an outdent
          createTokenInstance(
            Newline,
            '\n',
            lastToken?.startOffset ?? NaN,
            lastToken?.endOffset ?? NaN,
            lastToken?.startLine ?? NaN,
            lastToken?.endLine ?? NaN,
            lastToken?.startColumn ?? NaN,
            lastToken?.endColumn ?? NaN,
          ),
        )
      }

      // even though we are adding fewer outdents directly we still need to update the indent stack fully.
      if (startOffset === 1) {
        indentStack.pop()
      }

      // return outdent match
      return match
    }

    return null
  },
  start_chars_hint: all_chars,
})

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
  pattern: /@/,
  start_chars_hint: ['@'],
})

export const Command = createToken({
  name: 'Command',
  pattern: /#/,
  start_chars_hint: ['#'],
})

export const Go = createToken({
  name: 'Go',
  pattern: /\//,
  start_chars_hint: ['/'],
})

export const Try = createToken({
  name: 'Try',
  pattern: /\?/,
  start_chars_hint: ['?'],
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
  if (`@#/?':!|`.includes(text[cursor])) {
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

function matchNestedText(text: string, startOffset: number, matched: IToken[]) {
  if (!matchTextEnabled) {
    return null
  }

  const [lastMatched] = matched.slice(-1)

  // check for indent, then pipe |
  if (
    lastMatched &&
    lastMatched.tokenType !== Indent &&
    lastMatched.tokenType !== Newline
  ) {
    return null
  }

  const currentChar = text[startOffset]

  // detect beginning of text
  if (currentChar !== '|') {
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

export const BasicText = createToken({
  name: 'BasicText',
  pattern: matchBasicText,
  line_breaks: false,
  start_chars_hint: all_chars.filter((ch) => `@#/?':!|`.includes(ch) === false),
})

export const NestedText = createToken({
  name: 'NestedText',
  pattern: matchNestedText,
  line_breaks: false,
  start_chars_hint: ['|'],
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
  pattern: /[_a-zA-Z"$][^!;@#/?\s]*/,
  start_chars_hint: all_chars,
})

export const StringLiteralDouble = createToken({
  name: 'StringLiteralDouble',
  pattern: /"(?:[^\\"]|\\(?:[^\n\r]|u[0-9a-fA-F]{4}))*"/,
})

function createWordToken(word: string, name = '') {
  return createToken({
    name: name || word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
    longer_alt: StringLiteral,
  })
}

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
})

// comparision

export const IsEq = createToken({
  name: 'IsEq',
  pattern: /=|eq|equal/,
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
export const ModDivide = createToken({ name: 'ModDivide', pattern: /%/ })
export const FloorDivide = createToken({ name: 'FloorDivide', pattern: /%%/ })

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
  pattern: /#play.*/,
  start_chars_hint: all_chars,
})

// core / structure commands

export const Command_if = createWordToken('if|try|take|give', 'if')
// may not need this ?
export const Command_api = createWordToken('set|clear', 'api')
export const Command_else = createWordToken('else')
export const Command_while = createWordToken('while')
export const Command_repeat = createWordToken('repeat')
export const Command_read = createWordToken('read')
export const Command_break = createWordToken('break')
export const Command_continue = createWordToken('continue')

function createTokenSet(primary: TokenType[]) {
  return [
    // primary tokens
    ...primary,
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
    FloorDivide,
    ModDivide,
    // grouping
    LParen,
    RParen,
    // content
    StringLiteralDouble,
    StringLiteral,
    NumberLiteral,
  ]
}

export const allTokens = createTokenSet([
  // block lines
  Outdent,
  Indent,
  // text output
  BasicText,
  NestedText,
  // commands
  Stat,
  Command_play,
  Command,
  Go,
  Try,
  // flow
  Comment,
  Label,
  HyperLink,
  HyperLinkText,
  Newline,
  Whitespace,
  // core / structure commands
  Command_if,
  // Command_api,
  Command_else,
  Command_while,
  Command_repeat,
  Command_read,
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

  indentStack = [0]
  const lexResult = scriptLexer.tokenize(text)

  let lastToken = last(lexResult.tokens)
  if (!lastToken) {
    return lexResult
  }

  // add remaining Outdents
  while (indentStack.length > 1) {
    lexResult.tokens.push(
      createTokenInstance(
        Outdent,
        '<<??',
        lastToken.startOffset,
        lastToken.endOffset ?? NaN,
        lastToken.startLine ?? NaN,
        lastToken.endLine ?? NaN,
        lastToken.startColumn ?? NaN,
        lastToken.endColumn ?? NaN,
      ),
    )
    indentStack.pop()
  }

  // add final new line ?
  lastToken = last(lexResult.tokens)
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
