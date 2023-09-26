import test_zss from 'bundle-text:./test/blocks.txt'

import { createAPI } from './chip'
import { createGenerator } from './generator'

export function langTest() {
  const gen = createGenerator(test_zss)
  console.info(gen)

  // const api = createAPI(gen?.labels)
  // const brain = gen.code(api)

  console.info(brain.next())

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
