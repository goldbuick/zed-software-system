import { createToken, IToken, Lexer } from 'chevrotain'

import { range } from '/zss/mapping/array'

import { LANG_DEV } from '../../config'

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

export const Whitespace = createToken({
  name: 'Whitespace',
  pattern: / +/,
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

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\$-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
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

const colorIndex = {
  dkblue: 1,
  dkgreen: 2,
  dkcyan: 3,
  dkred: 4,
  dkpurple: 5,
  brown: 6,
  gray: 7,
  dkgray: 8,
  blue: 1 + 8,
  green: 2 + 8,
  cyan: 3 + 8,
  red: 4 + 8,
  purple: 5 + 8,
  yellow: 6 + 8,
  white: 7 + 8,
  black: 0,
}

const allColors = colors.map(([clr, name]) =>
  createWordToken(`\\$(${clr})`, name || clr),
)
const allBgColors = colors.map(([clr, name]) =>
  createWordToken(`\\$on(${clr})`, `on${name || clr}`),
)

export const allTokens = [
  Whitespace,
  ...allColors,
  ...allBgColors,
  StringLiteral,
  StringLiteralDouble,
  NumberLiteral,
]

const scriptLexer = new Lexer(allTokens, {
  skipValidations: !LANG_DEV,
  ensureOptimizations: LANG_DEV,
})

export function tokenize(text: string) {
  const lexResult = scriptLexer.tokenize(text)
  return lexResult
}

export function writeTextFormat(
  tokens: IToken[],
  x: number,
  y: number,
  width: number,
  chars: number[],
  colors: number[],
  bgs: number[],
) {
  let activeColor: number | undefined
  let activeBg: number | undefined

  function incCursor() {
    ++x
    if (x >= width) {
      x = 0
      ++y
    }
  }

  function writeStr(str: string) {
    for (let t = 0; t < str.length; ++t) {
      const i = x + y * width
      chars[i] = str.charCodeAt(t)
      if (activeColor !== undefined) {
        colors[i] = activeColor
      }
      if (activeBg !== undefined) {
        bgs[i] = activeBg
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
      case allColors[15]:
        activeColor = colorIndex[token.tokenType.name] ?? 0
        break
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
      case allBgColors[15]:
        activeBg = colorIndex[token.tokenType.name.replace('on', '')] ?? 0
        break
      case NumberLiteral: {
        const i = x + y * width
        chars[i] = parseFloat(token.image.replace('$', ''))
        if (activeColor !== undefined) {
          colors[i] = activeColor
        }
        if (activeBg !== undefined) {
          bgs[i] = activeBg
        }
        incCursor()
        break
      }

      default:
        writeStr(token.image)
        break
    }
  }
}
