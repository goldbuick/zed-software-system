import test_zss from 'bundle-text:./test/totalwar.txt'

import { compileAST } from './ast'
import transformAst from './transformer'

/*

*/

export function langTest() {
  const astResult = compileAST(test_zss)

  if (astResult.errors) {
    console.info(astResult)
    // console.info(astResult.tokens)
    // console.info(astResult.errors)
    return
  }

  const jsCode = transformAst(astResult.ast)
  console.info(jsCode.code)
  console.info(jsCode.labels)
}
