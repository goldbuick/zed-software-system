import { CstNode, IToken } from 'chevrotain'
import { isarray } from 'zss/mapping/types'

import { compileparse } from './compileparse'
import type { LANG_ERROR } from './lexer'
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

export function compileast(text: string): {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
} {
  const parsed = compileparse(text)
  if (parsed.errors && parsed.errors.length > 0) {
    return parsed
  }
  if (!parsed.cst) {
    return parsed
  }

  const [ast] = visitor.go(parsed.cst)
  if (!ast) {
    return {
      tokens: parsed.tokens,
      cst: parsed.cst,
      errors: [
        { message: 'no ast output', offset: 0, line: 0, column: 0, length: 0 },
      ],
    }
  }

  // need this for code completion
  addRange(ast)

  return {
    tokens: parsed.tokens,
    cst: parsed.cst,
    ast,
  }
}
