import { CstNode, IToken } from 'chevrotain'

import { LANG_ERROR, tokenize } from './lexer'
import { parser } from './parser'

/** Lex + parse to CST only (no AST visitor — safe for Node task scripts). */
export function compileparse(text: string): {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
} {
  const tokens = tokenize(`${text}\n`)
  if (tokens.errors.length > 0) {
    return tokens
  }

  parser.input = tokens.tokens
  const cst = parser.program()
  if (parser.errors.length > 0) {
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

  return {
    tokens: tokens.tokens,
    cst,
  }
}
