import { CstNode, IToken } from 'chevrotain'
import type { CodeNode } from 'zss/feature/lang/backend/typescript/visitor'

import { compileparse } from './compileparse'
import type { LANG_ERROR } from './lexer'
import { visitor } from './visitor'

/** Lex + parse + visit a ZZT-OOP program into the shared `CodeNode` AST. */
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

  visitor.source = text
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

  return { tokens: parsed.tokens, cst: parsed.cst, ast }
}
