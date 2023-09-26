import { compileAST } from './ast'
import { transformAst } from './transformer'

// eslint-disable-next-line func-names, @typescript-eslint/no-empty-function
const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor

export function createGenerator(text: string) {
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

  const jsCode = transformAst(astResult.ast)
  if (jsCode.code) {
    try {
      console.info(jsCode.code)
      return {
        ...jsCode,
        code: new GeneratorFunction('api', jsCode.code),
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
    ...jsCode,
    code: new GeneratorFunction('api', 'const empty = true;'),
  }
}
