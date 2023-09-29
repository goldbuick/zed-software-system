import test_zss from 'bundle-text:./doot.txt'

import { WORD, createChip } from '../lang/chip'
import { createFirmware } from '../lang/firmware'
import { compile } from '../lang/generator'

export function langTest() {
  const values: Record<string, number> = {}

  // define commands
  const firmware = createFirmware()
    .command('print', (chip, args: WORD[]) => {
      console.info(...args)
      return 0
    })
    .command('set', (chip, args: WORD[]) => {
      const [name, value] = args
      if (chip.isString(name)) {
        values[name] = chip.evalToNumber(value)
      }
      return 0
    })
    .command('get', (chip, args: WORD[]) => {
      const [name] = args
      if (chip.isString(name)) {
        return values[name] ?? 0
      }
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
