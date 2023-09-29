import test_zss from 'bundle-text:./doot.txt'

import { WORD, createChip } from '../lang/chip'
import { createFirmware } from '../lang/firmware'
import { compile } from '../lang/generator'

export function langTest() {
  // define commands
  const firmware = createFirmware()
    .command('print', (args: WORD[]) => {
      console.info(args)
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
  chip.tick()
}
