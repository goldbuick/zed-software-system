import test_zss from 'bundle-text:./test/blocks.txt'

import { createChip } from './chip'
import { createFirmware } from './firmware'
import { compile } from './generator'

export function langTest() {
  // define commands
  const firmware = createFirmware()
    .command('text', () => {
      return 0
    })
    .command('stat', () => {
      return 0
    })

  // compile script into runnable code
  const build = compile(test_zss)

  // create chip from compiled zss
  const chip = createChip(build)

  // install firmware on chip
  firmware.install(chip)

  // run chip
  console.info(firmware)

  // console.info(gen)
  // const api = createAPI(gen?.labels)
  // const brain = gen.code(api)
  // console.info(brain.next())
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
