import { createToken, IToken, Lexer } from 'chevrotain'
import { range } from 'zss/mapping/array'

import { LANG_DEV } from '../../config'

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

export const Whitespace = createToken({
  name: 'Whitespace',
  pattern: / +/,
})

export const WhitespaceSkipped = createToken({
  name: 'WhitespaceSkipped',
  pattern: / +/,
  group: Lexer.SKIPPED,
})

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /[^ $]+/,
  start_chars_hint: all_chars,
})

export const StringLiteralDouble = createToken({
  name: 'StringLiteralDouble',
  pattern: /"(?:[^\\"]|\\(?:[^\n\r]|u[0-9a-fA-F]{4}))*"/,
})

export const MaybeFlag = createToken({
  name: 'MaybeFlag',
  pattern: /\$[^ $]+/,
})

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\$-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
})

export const ContinueLine = createToken({
  name: 'ContinueLine',
  pattern: /\\/,
})

function createWordToken(word: string, name = '') {
  return createToken({
    name: name || word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
  })
}

const colors = [
  ['blue'],
  ['green'],
  ['cyan'],
  ['red'],
  ['purple'],
  ['yellow'],
  ['white'],
  ['dkblue'],
  ['dkgreen'],
  ['dkcyan'],
  ['dkred'],
  ['dkpurple'],
  ['dkyellow|brown', 'brown'],
  ['dkwhite|ltgray|ltgrey|gray|grey', 'gray'],
  ['dkgray|dkgrey|ltblack', 'dkgray'],
  ['black'],
]

const colorIndex: Record<string, number> = {
  black: 0,
  dkblue: 1,
  dkgreen: 2,
  dkcyan: 3,
  dkred: 4,
  dkpurple: 5,
  brown: 6,
  gray: 7,
  dkgray: 8,
  blue: 9,
  green: 10,
  cyan: 11,
  red: 12,
  purple: 13,
  yellow: 14,
  white: 15,
}

const allColors = colors.map(([clr, name]) =>
  createWordToken(`\\$(${clr})`, name || clr),
)
const allBgColors = colors.map(([clr, name]) =>
  createWordToken(`\\$on(${clr})`, `on${name || clr}`),
)

export const allTokens = [
  Whitespace,
  ContinueLine,
  ...allColors,
  ...allBgColors,
  StringLiteralDouble,
  StringLiteral,
  NumberLiteral,
  MaybeFlag,
]

const scriptLexer = new Lexer(allTokens, {
  skipValidations: !LANG_DEV,
  ensureOptimizations: LANG_DEV,
})

const scriptLexerNoWhitespace = new Lexer(
  [
    WhitespaceSkipped,
    ContinueLine,
    ...allColors,
    ...allBgColors,
    StringLiteralDouble,
    StringLiteral,
    NumberLiteral,
    MaybeFlag,
  ],
  {
    skipValidations: !LANG_DEV,
    ensureOptimizations: LANG_DEV,
  },
)

export function tokenize(text: string, noWhitespace = false) {
  if (noWhitespace) {
    return scriptLexerNoWhitespace.tokenize(text)
  }
  return scriptLexer.tokenize(text)
}

export type WRITE_TEXT_CONTEXT = {
  x: number
  y: number
  isEven: boolean
  resetColor: number
  resetBg: number
  activeColor: number | undefined
  activeBg: number | undefined
  width: number
  char: number[]
  color: number[]
  bg: number[]
}

export function writeTextColorReset(context: WRITE_TEXT_CONTEXT) {
  context.activeColor = context.resetColor
  context.activeBg = context.resetBg
}

export function writeTextFormat(
  tokens: IToken[],
  context: WRITE_TEXT_CONTEXT,
): boolean {
  function incCursor() {
    ++context.x
    if (context.x >= context.width) {
      context.x = 0
      ++context.y
    }
  }

  function writeStr(str: string) {
    for (let t = 0; t < str.length; ++t) {
      const i = context.x + context.y * context.width
      context.char[i] = str.charCodeAt(t)
      if (context.activeColor !== undefined) {
        context.color[i] = context.activeColor
      }
      if (context.activeBg !== undefined) {
        context.bg[i] = context.activeBg
      }
      incCursor()
    }
  }

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i]
    switch (token.tokenType) {
      case allColors[0]:
      case allColors[1]:
      case allColors[2]:
      case allColors[3]:
      case allColors[4]:
      case allColors[5]:
      case allColors[6]:
      case allColors[7]:
      case allColors[8]:
      case allColors[9]:
      case allColors[10]:
      case allColors[11]:
      case allColors[12]:
      case allColors[13]:
      case allColors[14]:
      case allColors[15]: {
        const colorName = token.tokenType.name
        context.activeColor = colorIndex[colorName] ?? 0
        break
      }
      case allBgColors[0]:
      case allBgColors[1]:
      case allBgColors[2]:
      case allBgColors[3]:
      case allBgColors[4]:
      case allBgColors[5]:
      case allBgColors[6]:
      case allBgColors[7]:
      case allBgColors[8]:
      case allBgColors[9]:
      case allBgColors[10]:
      case allBgColors[11]:
      case allBgColors[12]:
      case allBgColors[13]:
      case allBgColors[14]:
      case allBgColors[15]: {
        const colorName = token.tokenType.name.replace('on', '')
        context.activeBg = colorIndex[colorName] ?? 0
        break
      }
      case NumberLiteral: {
        const i = context.x + context.y * context.width
        context.char[i] = parseFloat(token.image.replace('$', ''))
        if (context.activeColor !== undefined) {
          context.color[i] = context.activeColor
        }
        if (context.activeBg !== undefined) {
          context.bg[i] = context.activeBg
        }
        incCursor()
        break
      }
      case MaybeFlag: {
        // how to we make this work ?
        break
      }

      case StringLiteralDouble:
        writeStr(token.image.substring(1, token.image.length - 1))
        break

      case ContinueLine:
        return false

      default:
        writeStr(token.image)
        break
    }
  }

  // move to next line
  context.x = 0
  ++context.y
  return true
}

export function tokenizeAndWriteTextFormat(
  text: string,
  context: WRITE_TEXT_CONTEXT,
) {
  const result = tokenize(text)
  if (result.tokens?.length < 1) {
    return true
  }

  return writeTextFormat(result.tokens, context)
}
