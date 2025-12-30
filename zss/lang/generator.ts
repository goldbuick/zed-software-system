/* eslint-disable @typescript-eslint/no-implied-eval */
import { CstNode, IToken } from 'chevrotain'
import { SourceMapGenerator } from 'source-map'
import { CHIP } from 'zss/chip'
import { SHOW_CODE } from 'zss/config'

import { compileast } from './ast'
import { LANG_ERROR } from './lexer'
import { transformast } from './transformer'
import { CodeNode } from './visitor'

export type GeneratorFunc = (api: CHIP) => 0 | 1

export type GeneratorBuild = {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
  labels?: Record<string, number[]>
  map?: SourceMapGenerator
  code?: GeneratorFunc
  source?: string
}

export function compile(name: string, text: string): GeneratorBuild {
  const label = `compile-${name}`
  // eslint-disable-next-line no-console
  console.time(label)
  const astResult = compileast(text)
  // eslint-disable-next-line no-console
  console.timeEnd(label)

  if (SHOW_CODE) {
    console.info(text, astResult.errors)
  }

  if (astResult.errors && astResult.errors.length > 0) {
    console.info(text, astResult.tokens, astResult.errors)
    return astResult
  }

  if (!astResult.ast) {
    return {
      ...astResult,
      errors: [
        { message: 'no ast output', offset: 0, line: 0, column: 0, length: 0 },
      ],
    }
  }

  const transformResult = transformast(astResult.ast)

  if (transformResult.code) {
    if (SHOW_CODE) {
      console.info(transformResult.code)
    }
    try {
      return {
        ...astResult,
        ...transformResult,
        source: transformResult.code,
        code: new Function('api', transformResult.code) as GeneratorFunc,
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
        source: '',
        code: new Function('api', ' ') as GeneratorFunc,
      }
    }
  }

  return {
    ...astResult,
    ...transformResult,
    source: '',
    code: new Function('api', ' ') as GeneratorFunc,
  }
}
