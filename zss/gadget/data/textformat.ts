import { createToken, IToken, Lexer } from 'chevrotain'
import { createContext, useMemo } from 'react'
import { LANG_DEV } from 'zss/config'
import { colorconsts } from 'zss/firmware/wordtypes'
import { range } from 'zss/mapping/array'
import { ispresent, MAYBE } from 'zss/mapping/types'

import { COLOR, colortobg, colortofg } from './types'

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
  pattern: /[^ $;]+/,
  start_chars_hint: all_chars,
})

export const StringLiteralDouble = createToken({
  name: 'StringLiteralDouble',
  pattern: /"(?:[^\\"]|\\(?:[^\n\r]|u[0-9a-fA-F]{4}))*"/,
})

export const EscapedDollar = createToken({
  name: 'EscapedDollar',
  pattern: '$$',
})

export const MaybeFlag = createToken({
  name: 'MaybeFlag',
  pattern: /\$[^ $]+/,
})

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\$-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?\+?/,
})

export const HyperLinkText = createToken({
  name: 'HyperLinkText',
  pattern: /;[^;\n]*/,
  start_chars_hint: [';'],
})

function createWordToken(word: string, name = '') {
  return createToken({
    name: name || word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
  })
}

const colors = Object.keys(colorconsts)
const allcolors = colors.map((name) => createWordToken(`\\$(${name})`, name))

export const allTokens = [
  Whitespace,
  ...allcolors,
  StringLiteralDouble,
  StringLiteral,
  NumberLiteral,
  EscapedDollar,
  HyperLinkText,
  MaybeFlag,
]

const scriptLexer = new Lexer(allTokens, {
  skipValidations: !LANG_DEV,
  ensureOptimizations: LANG_DEV,
})

const scriptLexerNoWhitespace = new Lexer(
  [
    WhitespaceSkipped,
    ...allcolors,
    StringLiteralDouble,
    StringLiteral,
    NumberLiteral,
    EscapedDollar,
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
  measureonly: boolean
  x: number
  y: number
  isEven: boolean
  resetColor: number
  resetBg: number
  activeColor: number | undefined
  activeBg: number | undefined
  width: number
  height: number
  leftEdge: number | undefined
  rightEdge: number | undefined
  bottomEdge: number | undefined
  char: number[]
  color: number[]
  bg: number[]
}

export function createwritetextcontext(
  width: number,
  height: number,
  color: number,
  bg: number,
): WRITE_TEXT_CONTEXT {
  return {
    measureonly: false,
    x: 0,
    y: 0,
    isEven: true,
    resetColor: color,
    resetBg: bg,
    activeColor: color,
    activeBg: bg,
    width,
    height,
    leftEdge: undefined,
    rightEdge: undefined,
    bottomEdge: undefined,
    char: [],
    color: [],
    bg: [],
  }
}

export function applyWriteTextContext(
  dest: WRITE_TEXT_CONTEXT,
  source: WRITE_TEXT_CONTEXT,
) {
  dest.x = source.x
  dest.y = source.y
  dest.activeColor = source.activeColor
  dest.activeBg = source.activeBg
}

export function useCacheWriteTextContext(source: WRITE_TEXT_CONTEXT) {
  const cache = useMemo(() => ({ ...source }), [source])
  applyWriteTextContext(source, cache)
}

export const WriteTextContext = createContext(
  createwritetextcontext(1, 1, 15, 1),
)

export function writetextcolorreset(context: WRITE_TEXT_CONTEXT) {
  context.activeColor = context.resetColor
  context.activeBg = context.resetBg
}

function writetextformat(tokens: IToken[], context: WRITE_TEXT_CONTEXT) {
  const starty = context.y

  function incCursor() {
    ++context.x
    if (context.x >= (context.rightEdge ?? context.width)) {
      context.x = context.leftEdge ?? 0
      ++context.y
    }
  }

  function isVisible() {
    if (
      context.x < (context.leftEdge ?? 0) ||
      context.x >= (context.rightEdge ?? context.width) ||
      context.y < 0 ||
      context.y >= (context.bottomEdge ?? context.height)
    ) {
      return false
    }
    return true
  }

  function writeStr(str: string) {
    for (let t = 0; t < str.length; ++t) {
      if (context.measureonly !== true && isVisible()) {
        const i = context.x + context.y * context.width
        context.char[i] = str.charCodeAt(t)
        if (context.activeColor !== undefined) {
          context.color[i] = context.activeColor
        }
        if (context.activeBg !== undefined) {
          context.bg[i] = context.activeBg
        }
      }
      incCursor()
    }
  }

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i]
    switch (token.tokenType) {
      case EscapedDollar:
        writeStr('$')
        break

      case NumberLiteral:
        if (context.measureonly !== true && isVisible()) {
          const i = context.x + context.y * context.width
          context.char[i] = parseFloat(token.image.replace('$', ''))
          if (context.activeColor !== undefined) {
            context.color[i] = context.activeColor
          }
          if (context.activeBg !== undefined) {
            context.bg[i] = context.activeBg
          }
        }
        incCursor()
        break

      case StringLiteralDouble:
        writeStr(
          token.image
            .substring(1, token.image.length - 1)
            .replaceAll('\\"', '"'),
        )
        break

      default: {
        const tokenname = token.tokenType.name as keyof typeof colorconsts
        const maybename = colorconsts[tokenname]
        const maybecolor = colortofg(COLOR[maybename])
        const maybebg = colortobg(COLOR[maybename])
        if (maybecolor === COLOR.CLEAR) {
          // reset bg color
          context.activeBg = context.resetBg
        } else if (ispresent(maybecolor)) {
          // update fg color
          context.activeColor = maybecolor
        } else if (ispresent(maybebg)) {
          // update bg color
          context.activeBg = maybebg
        } else {
          writeStr(token.image)
        }
        break
      }
    }

    // basic boundry check
    if (context.y >= context.height) {
      return
    }
  }

  // move to next line if needed
  if (context.x !== 0 || context.y === starty) {
    context.x = context.leftEdge ?? 0
    ++context.y
  }
}

export function tokenizeandwritetextformat(
  text: string,
  context: WRITE_TEXT_CONTEXT,
  shouldreset: boolean,
) {
  const result = tokenize(text)
  if (!result.tokens) {
    return true
  }

  writetextformat(result.tokens, context)
  if (shouldreset) {
    writetextcolorreset(context)
  }

  return shouldreset
}

export function tokenizeandmeasuretextformat(
  text: string,
  width: number,
  height: number,
): MAYBE<WRITE_TEXT_CONTEXT> {
  const result = tokenize(text)
  if (!result.tokens) {
    return undefined
  }

  const context = createwritetextcontext(
    width,
    height,
    COLOR.WHITE,
    COLOR.BLACK,
  )
  context.measureonly = true

  writetextformat(result.tokens, context)
  return context
}

export function writechartoend(char: string, context: WRITE_TEXT_CONTEXT) {
  const delta = context.width - context.x
  if (delta < 1) {
    return
  }
  tokenizeandwritetextformat(char.repeat(delta), context, true)
}

export function applystrtoindex(
  p1: number,
  str: string,
  context: WRITE_TEXT_CONTEXT,
) {
  let t = 0
  const p2 = p1 + str.length
  for (let i = p1; i < p2; ++i) {
    context.char[i] = str.charCodeAt(t++)
  }
}

export function applycolortoindexes(
  p1: number,
  p2: number,
  color: number,
  bg: number,
  context: WRITE_TEXT_CONTEXT,
) {
  const left = Math.min(p1, p2)
  const right = Math.max(p1, p2)
  for (let i = left; i <= right; ++i) {
    context.color[i] = color
    context.bg[i] = bg
  }
}
