import { tokenize } from './lexer'
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
    { start: node.startOffset, end: node.endOffset || 0 },
  ]

  Object.keys(node).forEach((name) => {
    if (name !== 'parent') {
      const next = (node as Record<string, any>)[name]
      if (Array.isArray(next)) {
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
      ...offsets.filter((item) => item).map((item) => item?.start || 0),
    ),
    end: Math.max(
      ...offsets.filter((item) => item).map((item) => item?.end || 0),
    ),
  }

  return node.range
}

export function compileAST(text: string) {
  const tokens = tokenize(`${text}\n`)
  if (tokens.errors.length > 0) {
    return {
      errors: tokens.errors,
    }
  }

  console.info('tokens', tokens.tokens)

  parser.input = tokens.tokens
  const cst = parser.program()
  if (parser.errors.length > 0) {
    return {
      errors: parser.errors,
    }
  }

  console.info('cst', cst)

  const ast = visitor.visit(cst) as CodeNode
  if (!ast) {
    return {
      errors: ['no ast output'],
    }
  }

  // need this for code completion
  addRange(ast)

  return ast
}
