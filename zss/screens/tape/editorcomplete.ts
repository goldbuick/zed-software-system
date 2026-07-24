import * as lexer from 'zss/feature/lang/backend/typescript/lexer'
import { ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { EDITOR_CODE_ROW } from './common'

export type EDITOR_COMPLETE_CONTEXT = {
  labels: string[]
  variables: string[]
}

const VARIABLE_COMMANDS = new Set(['set', 'give', 'take', 'array', 'clear'])

function labelnamefromtoken(image: string): string {
  const trimmed = image.startsWith(':') ? image.slice(1) : image
  return NAME(trimmed)
}

/** Scan codepage rows for `:label` names and variable names from `#set`/`#give`/etc. */
export function buildeditorcompletecontext(
  rows: EDITOR_CODE_ROW[],
): EDITOR_COMPLETE_CONTEXT {
  const labels = new Set<string>()
  const variables = new Set<string>()

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    const tokens = row.tokens
    if (!tokens?.length) {
      continue
    }
    for (let t = 0; t < tokens.length; t++) {
      const token = tokens[t]
      if (token.tokenTypeIdx === lexer.label.tokenTypeIdx) {
        const name = labelnamefromtoken(token.image ?? '')
        if (name) {
          labels.add(`:${name}`)
        }
      }
    }
    for (let t = 0; t < tokens.length; t++) {
      if (tokens[t].tokenTypeIdx !== lexer.command.tokenTypeIdx) {
        continue
      }
      const cmdtoken = tokens[t + 1]
      if (!ispresent(cmdtoken)) {
        continue
      }
      const cmd = NAME(cmdtoken.image ?? '')
      if (!VARIABLE_COMMANDS.has(cmd)) {
        continue
      }
      const argtoken = tokens[t + 2]
      if (!ispresent(argtoken)) {
        continue
      }
      const argname = NAME(argtoken.image ?? '')
      if (argname) {
        variables.add(argname)
      }
    }
  }

  return {
    labels: [...labels].sort((a, b) => a.localeCompare(b)),
    variables: [...variables].sort((a, b) => a.localeCompare(b)),
  }
}
