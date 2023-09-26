import { CstNode, IToken } from 'chevrotain'

import { compileAST } from './ast'
import { transformAst } from './transformer'
import { CodeNode } from './visitor'

// eslint-disable-next-line func-names, @typescript-eslint/no-empty-function
const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor

export function createGenerator(text: string): {
  errors?: any[]
  tokens?: IToken[]
  cst?: CstNode
  ast?: CodeNode
} {
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
      console.info(transformResult.code)
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
        code: new GeneratorFunction('api', 'const empty = true;'),
      }
    }
  }

  return {
    ...astResult,
    ...transformResult,
    code: new GeneratorFunction('api', 'const empty = true;'),
  }
}
