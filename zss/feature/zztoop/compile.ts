/* eslint-disable @typescript-eslint/no-implied-eval */
import type { CHIP } from 'zss/chip'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'

import { compileast } from './ast'
import type { LANG_ERROR } from './lexer'

export type ZztoopBuild = {
  errors?: LANG_ERROR[]
  source?: string
  code?: (api: CHIP) => 0 | 1
}

/**
 * Compile a vanilla ZZT-OOP program to a runnable function on the shared ZSS
 * runtime, reusing the lang `transformast` codegen. Phase 1 targets the TS
 * generator only (no WASM parity).
 */
export function compilezztoop(_name: string, text: string): ZztoopBuild {
  const astresult = compileast(text)
  if (astresult.errors && astresult.errors.length > 0) {
    return { errors: astresult.errors }
  }
  if (!astresult.ast) {
    return {
      errors: [
        { message: 'no ast output', offset: 0, line: 0, column: 0, length: 0 },
      ],
    }
  }

  const transformed = transformast(astresult.ast)
  if (!transformed.code) {
    return { source: '', code: new Function('api', ' ') as ZztoopBuild['code'] }
  }

  try {
    return {
      source: transformed.code,
      code: new Function('api', transformed.code) as ZztoopBuild['code'],
    }
  } catch (error) {
    return {
      errors: [
        {
          message: `unexpected error ${(error as Error).message}`,
          offset: 0,
          line: 0,
          column: 0,
          length: 0,
        },
      ],
    }
  }
}
