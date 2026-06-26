import type { IToken } from 'chevrotain'
import { tokenize } from 'zss/feature/lang/backend/typescript/lexer'

export function tokenizeline(line: string): IToken[] {
  try {
    const result = tokenize(line.length ? `${line}\n` : ' \n')
    const tokens = result.tokens ?? []
    return tokens.filter((t) => (t.startLine ?? 1) === 1)
  } catch {
    return []
  }
}
