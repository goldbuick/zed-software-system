import { compileAST } from './ast'
import { transformAst } from './transformer'

// eslint-disable-next-line func-names, @typescript-eslint/no-empty-function
const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor

export function compile(text: string) {
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
      // console.info(error)
      console.info(jsCode.code)
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

/*

hasmessage
shouldyield
getcase
endofprogram


text value
stat words
hyperlink message label
command words
if|try|take|give words
while words
repeatStart index
repeat index words
or words
and words
not words
isEq lhs rhs
isNotEq lhs rhs
isLessThan lhs rhs
isGreaterThan lhs rhs
isLessThanOrEq lhs rhs
isGreaterThanOrEq lhs rhs
opPlus rhs
opMinus rhs
opPower rhs
opMultiply rhs
opDivide rhs
opModDivide rhs
opFloorDivide rhs
opUniPlus rhs
opUniMinus rhs


*/
