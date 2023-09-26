import test_zss from 'bundle-text:./test/blocks.txt'

import { createGenerator } from './generator'

export function langTest() {
  const gen = createGenerator(test_zss)
  console.info(gen)

  const brain = gen.code({
    // api ref goes here ...
  })

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
