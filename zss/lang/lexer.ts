import {
  createToken,
  createTokenInstance,
  Lexer,
  IToken,
  TokenType,
} from 'chevrotain'

import { range } from '/zss/mapping/array'

import { DEV } from '/zss/config'

// State required for matching the indentations
let indentStack = [0]

function isEmpty(arr: unknown[] | undefined) {
  return Array.isArray(arr) && arr.length === 0
}

function last<T>(arr: T[] | undefined) {
  if (Array.isArray(arr)) {
    return arr.slice(-1)[0]
  }
  return undefined
}

function findLastIndex<T>(
  array: Array<T>,
  predicate: (value: T, index: number, obj: T[]) => boolean,
): number {
  let l = array.length
  while (l--) {
    if (predicate(array[l], l, array)) return l
  }
  return -1
}

const indentRegExp = / +/y
function matchIndentBase(
  text: string,
  offset: number,
  matchedTokens: IToken[],
  groups: { [groupName: string]: IToken[] },
  type: string,
) {
  const noTokensMatchedYet = isEmpty(matchedTokens)
  const newLines = groups['newline']
  const lastNewLine = last(newLines)
  const noNewLinesMatchedYet = isEmpty(newLines)

  // windows newlines are two chars
  const lastNewLineLength = lastNewLine?.image.length || 0
  const lastNewLineOffset =
    (lastNewLine?.startOffset || -100) + lastNewLineLength
  const isFirstLine = noTokensMatchedYet && noNewLinesMatchedYet

  // only newlines matched so far
  const onlyNewLinesMatched = noTokensMatchedYet && !noNewLinesMatchedYet

  // Both newlines and other Tokens have been matched AND the offset is just after the last newline
  const bothMatchedJustAfter =
    !noTokensMatchedYet && !noNewLinesMatchedYet && offset === lastNewLineOffset

  // Determine start of line
  const isStartOfLine = onlyNewLinesMatched || bothMatchedJustAfter

  // indentation can only be matched at the start of a line.
  if (isFirstLine || isStartOfLine) {
    let currIndentLevel: number

    indentRegExp.lastIndex = offset
    const match = indentRegExp.exec(text)

    // possible non-empty indentation
    if (match !== null) {
      currIndentLevel = match[0].length
    } else {
      // "empty" indentation means indentLevel of 0.
      currIndentLevel = 0
    }

    const prevIndentLevel = last(indentStack) || 0
    if (currIndentLevel > prevIndentLevel && type === 'indent') {
      // deeper indentation
      indentStack.push(currIndentLevel)
      return match
    } else if (currIndentLevel < prevIndentLevel && type === 'outdent') {
      // shallower indentation
      const matchIndentIndex = findLastIndex(
        indentStack,
        (stackIndentDepth) => stackIndentDepth === currIndentLevel,
      )

      // any outdent must match some previous indentation level.
      if (matchIndentIndex === -1) {
        // how do we show an error here ???
        return null //throw Error(`invalid outdent at offset: ${offset}`)
      }

      const numberOfDedents = indentStack.length - matchIndentIndex - 1

      // This is a little tricky
      // 1. If there is no match (0 level indent) than this custom token
      //    matcher would return "null" and so we need to add all the required outdents ourselves.
      // 2. If there was match (> 0 level indent) than we need to add minus one number of outsents
      //    because the lexer would create one due to returning a none null result.
      const iStart = match !== null ? 1 : 0
      for (let i = iStart; i < numberOfDedents; i++) {
        indentStack.pop()
        matchedTokens.push(
          createTokenInstance(Outdent, '  ', NaN, NaN, NaN, NaN, NaN, NaN),
        )
      }

      // even though we are adding fewer outdents directly we still need to update the indent stack fully.
      if (iStart === 1) {
        indentStack.pop()
      }

      return match
    } else {
      // same indent, this should be lexed as simple whitespace and ignored
      return null
    }
  } else {
    // indentation cannot be matched under other circumstances
    return null
  }
}

// customize matchIndentBase to create separate functions of Indent and Outdent.
function matchIndent(
  text: string,
  offset: number,
  matchedTokens: IToken[],
  groups: { [groupName: string]: IToken[] },
) {
  return matchIndentBase(text, offset, matchedTokens, groups, 'indent')
}

function matchOutdent(
  text: string,
  offset: number,
  matchedTokens: IToken[],
  groups: { [groupName: string]: IToken[] },
) {
  return matchIndentBase(text, offset, matchedTokens, groups, 'outdent')
}

// indentation & Newline
export const Indent = createToken({
  name: 'Indent',
  line_breaks: false,
  pattern: matchIndent,
  start_chars_hint: [' ', '\n', '\r'],
})

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

export const Outdent = createToken({
  name: 'Outdent',
  line_breaks: false,
  pattern: matchOutdent,
  start_chars_hint: all_chars,
})

const newlineRegExp = /\n|\r\n?/y
export const Newline = createToken({
  name: 'Newline',
  group: 'newline',
  line_breaks: true,
  // start_chars_hint: [' ', '\n', '\r'],
  start_chars_hint: ['\n', '\r'],
  pattern(text: string, offset: number, tokens: IToken[]) {
    const lastToken = tokens.slice(-1)[0]
    newlineRegExp.lastIndex = offset

    const match = newlineRegExp.exec(text)
    if (match) {
      tokens.push(
        createTokenInstance(
          Newline,
          match[0],
          offset,
          offset + match[0].length - 1,
          lastToken?.startLine || NaN,
          lastToken?.endLine || NaN,
          lastToken?.startColumn || NaN,
          lastToken?.endColumn || NaN,
        ),
      )
    }

    return match
  },
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

/*

lines should start with these primary tokens

@ attributes
# command
/ movement
? movement
$ message text
" message text 
' comment
: label
! hyperlink

@#/?':!

*/

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

const notText = `@#/?':!`
const text_start_chars = all_chars.filter(
  (ch) => notText.includes(ch) === false,
)

let matchTextEnabled = false

function matchText(text: string, startOffset: number, matched: IToken[]) {
  if (!matchTextEnabled) {
    return null
  }

  // check for beginning of line
  const [lastMatched] = matched.slice(-1)
  if (lastMatched && lastMatched.tokenType !== Newline) {
    return null
  }

  // scan beginning of line whitespace
  let cursor = startOffset
  while (text[cursor] === ' ' || text[cursor] === '\t') {
    cursor++
  }

  // detect beginning of text
  if (notText.includes(text[cursor])) {
    return null
  }

  // scan until EOL
  let i = startOffset + 1
  while (i < text.length && text[i] !== '\n') {
    i++
  }

  const match = text.substring(startOffset, i)
  // console.info('>>', match)
  return [match] as RegExpExecArray
}

export const Text = createToken({
  name: 'Text',
  pattern: matchText,
  line_breaks: false,
  start_chars_hint: text_start_chars,
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
  pattern: /![^;\n]*/,
  start_chars_hint: ['!'],
})

export const HyperLinkText = createToken({
  name: 'HyperLinkText',
  pattern: /;.*/,
  start_chars_hint: [';'],
})

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /[_a-zA-Z"][^@#/?\s]*/,
  start_chars_hint: all_chars,
})

function createWordToken(word: string, name = '') {
  return createToken({
    name: name || word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
    longer_alt: StringLiteral,
  })
}

// @ attributes
// # command
// / movement
// ? movement
// ' comment
// : label
// ! hyperlink

// $ message text
// [everything else] message text

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
})

// comparision

export const IsEq = createToken({
  name: 'IsEq',
  pattern: /=|eq/,
  longer_alt: StringLiteral,
})
export const IsNotEq = createToken({
  name: 'IsNotEq',
  pattern: /!=|noteq/,
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
  pattern: /<=|lteq/,
  longer_alt: StringLiteral,
})
export const IsGreaterThanOrEqual = createToken({
  name: 'IsGreaterThanOrEqual',
  pattern: />=|gteq/,
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

// structure commands

export const Command_if = createWordToken('if|try|take|give', 'if')
export const Command_else = createWordToken('else')
export const Command_while = createWordToken('while')
export const Command_repeat = createWordToken('repeat')
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
    // structure commands
    Command_if,
    Command_else,
    Command_while,
    Command_repeat,
    Command_break,
    Command_continue,
    // content
    StringLiteral,
    NumberLiteral,
  ]
}

export const allTokens = createTokenSet([
  Text,
  Stat,
  Command_play,
  Command,
  Go,
  Try,
  Comment,
  Label,
  HyperLink,
  HyperLinkText,
  Newline,
  Outdent,
  Indent,
  Whitespace,
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
    skipValidations: !DEV,
    ensureOptimizations: DEV,
  },
)

export function tokenize(text: string) {
  matchTextEnabled = true

  indentStack = [0]
  const lexResult = scriptLexer.tokenize(text)

  // fix newline tokens
  const newlineLookup: Record<number, IToken> = {}
  lexResult.groups['newline'].forEach((token) => {
    newlineLookup[token.startOffset] = token
  })
  lexResult.tokens
    .filter((token) => token.tokenType.name === 'Newline')
    .forEach((token) => {
      const fixer = newlineLookup[token.startOffset]
      if (fixer) {
        Object.keys(fixer).forEach((key) => {
          // @ts-expect-error cst element
          token[key] = fixer[key]
        })
      }
    })

  // add final new line ?
  const last = lexResult.tokens.slice(-1)[0]
  if (last && last.tokenType.name !== 'Newline') {
    lexResult.tokens.push(
      createTokenInstance(Newline, '\n', NaN, NaN, NaN, NaN, NaN, NaN),
    )
  }

  // add remaining Outdents
  while (indentStack.length > 1) {
    lexResult.tokens.push(
      createTokenInstance(Outdent, '  ', NaN, NaN, NaN, NaN, NaN, NaN),
    )
    indentStack.pop()
  }

  return lexResult
}
