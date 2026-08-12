import { CstNode, ILexingResult, IToken } from 'chevrotain'
import { isarray } from 'zss/mapping/types'

import { formatlangerror, linetokensbeforefault } from './formatlangerror'
import { LANG_ERROR, tokenize } from './lexer'
import { parser } from './parser'
import { type CodeNode, visitor } from './visitor'

type OffsetRange = {
  start: number
  end: number
}

function addRange(node: CodeNode | undefined): OffsetRange | undefined {
  if (!node || node.type === undefined) {
    return undefined
  }

  const offsets: (OffsetRange | undefined)[] = [
    { start: node.startOffset, end: node.endOffset ?? 0 },
  ]

  Object.keys(node).forEach((name) => {
    if (name !== 'parent') {
      const next = (node as Record<string, any>)[name]
      if (isarray(next)) {
        next.forEach((item) => {
          offsets.push(addRange(item))
        })
      } else {
        offsets.push(addRange(next))
      }
    }
  })

  node.range = {
    start: Math.min(
      ...offsets.filter((item) => item).map((item) => item?.start ?? 0),
    ),
    end: Math.max(
      ...offsets.filter((item) => item).map((item) => item?.end ?? 0),
    ),
  }

  return node.range
}

function maplexererrors(lexresult: ILexingResult): LANG_ERROR[] {
  return lexresult.errors.map((error) => ({
    offset: error.offset,
    line: error.line,
    column: error.column,
    length: error.length,
    message: formatlangerror({
      kind: 'lexer',
      raw: error.message,
    }).message,
  }))
}

function mapparsererrors(input: IToken[]): LANG_ERROR[] {
  return parser.errors.map((error) => ({
    offset: error.token.startOffset,
    line: error.token.startLine,
    column: error.token.startColumn,
    length: error.token.image.length,
    message: formatlangerror({
      kind: 'parser',
      raw: error.message,
      token: error.token,
      linetokens: linetokensbeforefault(input, error.token),
    }).message,
  }))
}

export type CompileAstOptions = {
  ranges?: boolean
}

export function compileast(
  text: string,
  options: CompileAstOptions = {},
): {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
} {
  const withranges = options.ranges ?? true
  const tokens = tokenize(`${text}\n`)
  if (tokens.errors.length > 0) {
    return {
      tokens: tokens.tokens,
      errors: maplexererrors(tokens),
    }
  }

  parser.input = tokens.tokens
  const cst = parser.program()
  if (parser.errors.length > 0) {
    return {
      tokens: tokens.tokens,
      errors: mapparsererrors(tokens.tokens),
    }
  }

  const [ast] = visitor.go(cst)
  if (!ast) {
    return {
      tokens: tokens.tokens,
      cst,
      errors: [
        { message: 'no ast output', offset: 0, line: 0, column: 0, length: 0 },
      ],
    }
  }

  if (withranges) {
    // need this for code completion
    addRange(ast)
  }

  return {
    tokens: tokens.tokens,
    cst,
    ast,
  }
}

/** Editor path: keep partial CST when Chevrotain recovery reports errors. */
export function compileastforeditor(text: string): {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
} {
  const tokens = tokenize(`${text}\n`)
  if (tokens.errors.length > 0) {
    return {
      tokens: tokens.tokens,
      errors: maplexererrors(tokens),
    }
  }

  parser.input = tokens.tokens
  const cst = parser.program()
  const errors =
    parser.errors.length > 0 ? mapparsererrors(tokens.tokens) : undefined

  let ast: CodeNode | undefined
  if (parser.errors.length === 0) {
    const [maybeast] = visitor.go(cst) ?? []
    if (maybeast) {
      addRange(maybeast)
      ast = maybeast
    }
  }

  return {
    tokens: tokens.tokens,
    cst,
    ast,
    errors,
  }
}
