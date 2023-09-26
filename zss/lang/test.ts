import test_zss from 'bundle-text:./test/blocks.txt'

import { compile } from './api'

/*

*/

export function langTest() {
  console.info(compile(test_zss))
  // const astResult = compileAST(test_zss)

  // if (astResult.errors) {
  //   // console.info(astResult)
  //   console.info(astResult.tokens)
  //   console.info(astResult.errors)
  //   return
  // }

  // const jsCode = transformAst(astResult.ast)
  // console.info(jsCode.code)
  // console.info(jsCode.labels)
}
