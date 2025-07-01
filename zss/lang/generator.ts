import { CstNode, IToken } from 'chevrotain'
import { SourceMapGenerator } from 'source-map'
import { CHIP } from 'zss/chip'
import { SHOW_CODE } from 'zss/config'

import { compileast } from './ast'
import { LANG_ERROR } from './lexer'
import { transformast } from './transformer'
import { CodeNode } from './visitor'

const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor

export type GeneratorBuild = {
  errors?: LANG_ERROR[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
  labels?: Record<string, number[]>
  map?: SourceMapGenerator
  code?: (api: CHIP) => Generator<number>
  source?: string
}

export function compile(name: string, text: string): GeneratorBuild {
  const label = `compile-${name}`
  console.time(label)
  const astResult = compileast(text)
  console.timeEnd(label)

  if (SHOW_CODE) {
    console.info(text, astResult.errors)
  }

  if (astResult.errors && astResult.errors.length > 0) {
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
        code: new GeneratorFunction('api', transformResult.code),
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
        code: new GeneratorFunction('api', ' '),
      }
    }
  }

  return {
    ...astResult,
    ...transformResult,
    source: '',
    code: new GeneratorFunction('api', ' '),
  }
}
