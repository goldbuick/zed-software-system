import { CstNode, IToken } from 'chevrotain'

import { LANG_ERROR, tokenize } from './lexer'
import { parser } from './parser'

/** Lex + parse a ZZT-OOP program to a CST only (no visitor). */
export function compileparse(source: string): {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
} {
  const lexed = tokenize(source)
  if (lexed.errors.length > 0) {
    return { errors: lexed.errors, tokens: lexed.tokens }
  }

  parser.input = lexed.tokens
  const cst = parser.program()
  if (parser.errors.length > 0) {
    return {
      tokens: lexed.tokens,
      errors: parser.errors.map((error) => ({
        message: error.message,
        offset: error.token.startOffset,
        line: error.token.startLine,
        column: error.token.startColumn,
        length: error.token.image.length,
      })),
    }
  }

  return { tokens: lexed.tokens, cst }
}
