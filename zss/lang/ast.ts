import { CstNode, IToken } from 'chevrotain'
import { isarray } from 'zss/mapping/types'

import { LANG_ERROR, tokenize } from './lexer'
import { parser } from './parser'
import { CodeNode, visitor } from './visitor'

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

export function compileAST(text: string): {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
} {
  const tokens = tokenize(`${text}\n`)
  if (tokens.errors.length > 0) {
    return tokens
  }

  parser.input = tokens.tokens
  const cst = parser.program()
  if (parser.errors.length > 0) {
    const [primary] = parser.errors
    console.info(
      'errrrr',
      primary.context.ruleStack,
      primary.token,
      primary.message,
    )
    return {
      tokens: tokens.tokens,
      errors: parser.errors.map((error) => ({
        offset: error.token.startOffset,
        line: error.token.startLine,
        column: error.token.startColumn,
        length: error.token.image.length,
        message: error.message,
      })),
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

  // need this for code completion
  addRange(ast)

  return {
    tokens: tokens.tokens,
    cst,
    ast,
  }
}
