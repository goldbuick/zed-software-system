import { tokenize } from './lexer'
import { parser } from './parser'
import { CodeNode, visitor } from './visitor'

export function compileAST(text: string) {
  const tokens = tokenize(`${text}\n`)
  if (tokens.errors.length > 0) {
    return {
      errors: tokens.errors,
    }
  }

  parser.input = tokens.tokens
  const cst = parser.program()
  if (parser.errors.length > 0) {
    return {
      errors: parser.errors,
    }
  }

  const ast = visitor.visit(cst) as CodeNode
  if (!ast) {
    return {
      errors: ['no ast output'],
    }
  }

  return ast
}
