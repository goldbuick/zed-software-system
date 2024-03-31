import { CstNode, IToken } from 'chevrotain'
import { SourceMapGenerator } from 'source-map'
import { CHIP } from 'zss/chip'
import { SHOW_CODE } from 'zss/config'

import { compileAST } from './ast'
import { transformAst } from './transformer'
import { CodeNode } from './visitor'

// eslint-disable-next-line func-names, @typescript-eslint/no-empty-function
const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor

export type GeneratorBuild = {
  errors?: any[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
  labels?: Record<string, number[]>
  map?: SourceMapGenerator
  code?: (api: CHIP) => Generator<number>
  source?: string
}

export function compile(text: string): GeneratorBuild {
  const astResult = compileAST(text)
  if (astResult.errors && astResult.errors.length > 0) {
    return astResult
  }

  if (!astResult.ast) {
    return {
      ...astResult,
      errors: ['no ast output'],
    }
  }

  const transformResult = transformAst(astResult.ast)
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
            // @ts-expect-error cst element
            message: error.message,
          },
        ],
        source: 'there was an error',
        code: new GeneratorFunction('api', ' '),
      }
    }
  }

  return {
    ...astResult,
    ...transformResult,
    source: 'there was an error',
    code: new GeneratorFunction('api', ' '),
  }
}
