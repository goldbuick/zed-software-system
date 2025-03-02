import { createToken, createTokenInstance, IToken, Lexer } from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { range } from 'zss/mapping/array'
import { ispresent, MAYBE } from 'zss/mapping/types'
import { colorconsts, colortobg, colortofg } from 'zss/words/color'
import { COLOR } from 'zss/words/types'

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

export const Newline = createToken({
  name: 'Newline',
  line_breaks: true,
  start_chars_hint: ['\n', '\r'],
  pattern: /\n|\r\n?/,
})

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /[^ $;\r\n]+/,
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
  pattern: /\$[^-0-9"!;@#/?\s]+[^-"!;@#/?\s]*/,
  // pattern: /\$[^ $\r\n]+/,
})

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\$-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?\+?/,
})

export const HyperLinkText = createToken({
  name: 'HyperLinkText',
  pattern: /;[^;\r\n]*/,
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
  Newline,
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
    Newline,
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
  writefullwidth: MAYBE<number>
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
  // flag as changed
  changed: () => void
}

export function createwritetextcontext(
  width: number,
  height: number,
  color: number,
  bg: number,
  topedge?: number,
  leftedge?: number,
  rightedge?: number,
  bottomedge?: number,
): WRITE_TEXT_CONTEXT {
  return {
    disablewrap: false,
    measureonly: false,
    measuredwidth: 0,
    writefullwidth: undefined,
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
    changed() {},
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

export function writetextreset(context: WRITE_TEXT_CONTEXT) {
  context.active = { ...context.reset }
}

function writetextformat(tokens: IToken[], context: WRITE_TEXT_CONTEXT) {
  const starty = context.y

  function incCursor() {
    ++context.x
    const rightedge = context.active.rightedge ?? context.width - 1
    if (!context.disablewrap && context.x > rightedge) {
      context.x = context.active.leftedge ?? 0
      ++context.y
    }
    if (context.x > context.measuredwidth) {
      context.measuredwidth = context.x
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

      case Newline: {
        context.x = context.active.leftedge ?? 0
        ++context.y
        break
      }

      default: {
        const tokenname = token.tokenType.name as keyof typeof colorconsts
        const maybename = colorconsts[tokenname]
        const maybecolor = colortofg(COLOR[maybename])
        const maybebg = colortobg(COLOR[maybename])
        if (maybename === 'ONCLEAR') {
          // reset colors
          context.active.color = context.reset.color
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
  }

  // track overall width
  if (context.x > context.measuredwidth) {
    context.measuredwidth = context.x + 1
  }

  // fill line
  const leftedge = context.active.leftedge ?? 0
  if (
    ispresent(context.writefullwidth) &&
    (context.x > leftedge || context.y === starty)
  ) {
    const rightedge = context.active.rightedge ?? context.width - 1
    const fill = rightedge - context.x
    if (fill > 0) {
      writetextreset(context)
      const pttrn = String.fromCharCode(context.writefullwidth).repeat(fill)
      const i = context.x + context.y * context.width
      applycolortoindexes(
        i,
        i + pttrn.length,
        context.active.color,
        context.active.bg,
        context,
      )
      applystrtoindex(i, pttrn, context)
    }
  }
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

  // yolo
  context.changed()
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
  // min height is 1
  if (context.x > 0) {
    ++context.y
  }

  return context
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

  // yolo
  context.changed()
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

  // yolo
  context.changed()
}

export function clippedapplycolortoindexes(
  index: number,
  rightedge: number,
  p1: number, // relative to index
  p2: number, // relative to index
  color: number,
  bg: number,
  context: WRITE_TEXT_CONTEXT,
) {
  const left = Math.min(p1, p2)
  const right = Math.max(p1, p2)
  // out of bounds clipping
  if (left > rightedge || right < 0) {
    return
  }
  // clip left / right
  const clippedp1 = Math.max(0, left)
  const clippedp2 = Math.min(rightedge, right)
  // apply it
  applycolortoindexes(index + clippedp1, index + clippedp2, color, bg, context)
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

  // yolo
  context.changed()
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

export function textformatreadedges(context: WRITE_TEXT_CONTEXT) {
  const left = context.reset.leftedge ?? 0
  const right = context.reset.rightedge ?? context.width - 1
  const top = context.reset.topedge ?? 0
  const bottom = context.reset.bottomedge ?? context.height - 1
  const width = right - left + 1
  const height = bottom - top + 1
  return { left, right, top, bottom, width, height }
}
