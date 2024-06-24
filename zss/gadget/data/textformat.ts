import { createToken, createTokenInstance, IToken, Lexer } from 'chevrotain'
import { createContext as createcontext, useContext, useMemo } from 'react'
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
    HyperLinkText,
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

export type WRITE_PEN_CONTEXT = {
  color: number
  bg: number
  topedge: number | undefined
  leftedge: number | undefined
  rightedge: number | undefined
  bottomedge: number | undefined
}

export type WRITE_TEXT_CONTEXT = {
  // control
  disablewrap: boolean
  measureonly: boolean
  measuredwidth: number
  // cursor
  x: number
  y: number
  iseven: boolean
  // region
  width: number
  height: number
  // attr
  active: WRITE_PEN_CONTEXT
  // resets
  reset: WRITE_PEN_CONTEXT
  // output
  char: number[]
  color: number[]
  bg: number[]
}

export function createwritetextcontext(
  width: number,
  height: number,
  color: number,
  bg: number,
  topedge?: number | undefined,
  leftedge?: number | undefined,
  rightedge?: number | undefined,
  bottomedge?: number | undefined,
): WRITE_TEXT_CONTEXT {
  return {
    disablewrap: false,
    measureonly: false,
    measuredwidth: 0,
    x: 0,
    y: 0,
    iseven: true,
    active: {
      color: color,
      bg: bg,
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
    reset: {
      color: color,
      bg: bg,
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
    width,
    height,
    char: [],
    color: [],
    bg: [],
  }
}

export function applywritetextcontext(
  dest: WRITE_TEXT_CONTEXT,
  source: WRITE_TEXT_CONTEXT,
) {
  dest.x = source.x
  dest.y = source.y
  dest.active.color = source.active.color
  dest.active.bg = source.active.bg
}

export function useCacheWriteTextContext(source: WRITE_TEXT_CONTEXT) {
  const cache = useMemo(() => ({ ...source }), [source])
  applywritetextcontext(source, cache)
}

export const WriteTextContext = createcontext(
  createwritetextcontext(1, 1, 15, 1),
)

export function useWriteText() {
  return useContext(WriteTextContext)
}

export function writetextreset(context: WRITE_TEXT_CONTEXT) {
  context.active = { ...context.reset }
}

function writetextformat(tokens: IToken[], context: WRITE_TEXT_CONTEXT) {
  function incCursor() {
    ++context.x
    if (
      !context.disablewrap &&
      context.x >= (context.active.rightedge ?? context.width)
    ) {
      context.x = context.active.leftedge ?? 0
      ++context.y
    }
    if (context.x > context.measuredwidth) {
      context.measuredwidth = context.x + 1
    }
  }

  function isVisible() {
    return (
      context.x >= (context.active.leftedge ?? 0) &&
      context.x <= (context.active.rightedge ?? context.width - 1) &&
      context.y >= (context.active.topedge ?? 0) &&
      context.y <= (context.active.bottomedge ?? context.height - 1)
    )
  }

  function writeStr(str: string) {
    for (let t = 0; t < str.length; ++t) {
      if (context.measureonly !== true && isVisible()) {
        const i = context.x + context.y * context.width
        context.char[i] = str.charCodeAt(t)
        if (context.active.color !== undefined) {
          context.color[i] = context.active.color
        }
        if (context.active.bg !== undefined) {
          context.bg[i] = context.active.bg
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
          if (context.active.color !== undefined) {
            context.color[i] = context.active.color
          }
          if (context.active.bg !== undefined) {
            context.bg[i] = context.active.bg
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
          context.active.bg = context.reset.bg
        } else if (ispresent(maybecolor)) {
          // update fg color
          context.active.color = maybecolor
        } else if (ispresent(maybebg)) {
          // update bg color
          context.active.bg = maybebg
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

  // track overall width
  if (context.x > context.measuredwidth) {
    context.measuredwidth = context.x + 1
  }

  // move to next line
  context.x = context.active.leftedge ?? 0
  ++context.y
}

export function tokenizeandwritetextformat(
  text: string,
  context: WRITE_TEXT_CONTEXT,
  shouldreset: boolean,
) {
  const result = tokenize(text)
  if (!result.tokens) {
    return
  }

  writetextformat(result.tokens, context)
  if (shouldreset) {
    writetextreset(context)
  }
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

export function writeplaintext(
  text: string,
  context: WRITE_TEXT_CONTEXT,
  shouldreset: boolean,
) {
  // create plaintext token
  const plaintext = createTokenInstance(StringLiteral, text, 0, 0, 0, 0, 0, 0)
  // render it
  writetextformat([plaintext], context)
  if (shouldreset) {
    writetextreset(context)
  }
}

export function textformatedges(
  topedge: number,
  leftedge: number,
  rightedge: number,
  bottomedge: number,
  context: WRITE_TEXT_CONTEXT,
) {
  context.active.topedge = topedge
  context.active.leftedge = leftedge
  context.active.rightedge = rightedge
  context.active.bottomedge = bottomedge
}
