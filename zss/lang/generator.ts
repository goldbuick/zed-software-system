import { CstNode, IToken } from 'chevrotain'
import { SourceMapGenerator } from 'source-map'

import { compileAST } from './ast'
import { CHIP } from './chip'
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
    console.info(transformResult.code)
    try {
      return {
        ...astResult,
        ...transformResult,
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
        code: new GeneratorFunction('api', ' '),
      }
    }
  }

  return {
    ...astResult,
    ...transformResult,
    code: new GeneratorFunction('api', ' '),
  }
}
