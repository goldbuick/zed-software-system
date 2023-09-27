import { IToken } from 'chevrotain'

import { compileAST } from './ast'
import { GenContextAndCode, transformAst } from './transformer'

// eslint-disable-next-line func-names, @typescript-eslint/no-empty-function
const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor

export type GeneratorBuild = {
  errors?: any[]
  tokens?: IToken[]
} & Partial<GenContextAndCode>

export function createGenerator(text: string): GeneratorBuild {
  const astResult = compileAST(text)
  if (astResult.errors && astResult.errors.length > 0) {
    return {
      errors: astResult.errors,
    }
  }

  if (!astResult.ast) {
    return {
      errors: ['no ast output'],
    }
  }

  const transformResult = transformAst(astResult.ast)
  if (transformResult.code) {
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
