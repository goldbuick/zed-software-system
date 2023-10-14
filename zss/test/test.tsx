import test_zss from 'bundle-text:./layout.txt'
import React, { useEffect } from 'react'
import { compile, createChip } from 'zss/lang'

import { GadgetFirmware } from '../gadget'
import { Layout } from '../gadget/components/layout'

// compile script into runnable code
const build = compile(test_zss)
if (build.errors) {
  console.info(build.errors)
  console.info(build.tokens)
}

const chip = createChip(build)
GadgetFirmware.install(chip)

export function ComponentTest() {
  useEffect(() => {
    chip.tick()
  }, [])

  const snap = chip.snapshot('gadget')

  return <Layout panels={snap.layout} />
}

// export function langTest() {
//   // define commands
//   const firmware: FIRMWARE = createFirmware('test')
//     .command('print', (chip, args) => {
//       console.info(...args)
//       return 0
//     })
//     .command('set', (chip, args) => {
//       const [name, value] = args
//       if (chip.isString(name)) {
//         firmware.state(chip)[name] = chip.evalToNumber(value)
//       }
//       return 0
//     })
//     .command('get', (chip, args) => {
//       const [name] = args
//       if (chip.isString(name)) {
//         return firmware.value(chip, name) ?? 0
//       }
//       return 0
//     })
//     .command('if', (chip, args) => {
//       const [value] = args
//       return value
//     })
//     .command('send', (chip, args) => {
//       console.info('send', args)
//       return 0
//     })

//   // compile script into runnable code
//   const build = compile(test_zss)
//   if (build.errors) {
//     console.info(build.errors)
//     console.info(build.tokens)
//   }

//   // create chip from compiled zss
//   const chip = createChip(build)

//   // install firmware on chip
//   firmware.install(chip)

//   // run chip one tick
//   chip.tick()
// }
