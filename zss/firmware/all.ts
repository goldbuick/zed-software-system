import { maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import { isnumber } from 'zss/mapping/types'
import { memoryreadchip } from 'zss/memory'

import { ARG_TYPE, readargs } from './wordtypes'

export const ALL_FIRMWARE = createfirmware({
  get(chip, name) {
    return [false, undefined]
  },
  set(chip, name, value) {
    return [false, undefined]
  },
  shouldtick(chip) {
    //
  },
  tick(chip) {
    //
  },
  tock(chip) {
    //
  },
})
  .command('clear', (chip, words) => {
    const name = maptostring(words[0])
    chip.set(name, undefined)
    return 0
  })
  .command('end', (chip) => {
    // future, this will also afford giving a return value #end <value>
    chip.endofprogram()
    return 0
  })
  .command('give', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name, maybevalue, ii] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER,
    ])

    const maybecurrent = chip.get(name)
    const current = isnumber(maybecurrent) ? maybecurrent : 0
    const value = maybevalue ?? 1

    // giving a non-numerical value
    if (!isnumber(value)) {
      // todo: raise warning ?
      return 0
    }

    // returns true when setting an unset flag
    const result = maybecurrent === undefined ? 1 : 0
    if (result && ii < words.length) {
      chip.command(...words.slice(ii))
    }

    // update flag
    chip.set(name, current + value)
    return result
  })
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  // .command('if' // stub-only, this is a lang feature
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  // .command('restart' // this is handled by a built-in 0 label
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
    return 0
  })
  .command('set', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name, value] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])
    chip.set(name, value)
    return 0
  })
  .command('take', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [name, maybevalue, ii] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER,
    ])

    const current = chip.get(name)
    // default to #TAKE <name> 1
    const value = maybevalue ?? 1

    // taking from an unset flag, or non-numerical value
    if (!isnumber(current)) {
      // todo: raise warning ?
      return 1
    }

    const newvalue = current - value

    // returns true when take fails
    if (newvalue < 0) {
      if (ii < words.length) {
        chip.command(...words.slice(ii))
      }
      return 1
    }

    // update flag
    chip.set(name, newvalue)
    return 0
  })
  .command('unlock', (chip) => {
    chip.unlock()
    return 0
  })
  .command('zap', (chip, words) => {
    chip.zap(maptostring(words[0]))
    return 0
  })
  // gadget output & ui
  .command('text', (chip, words) => {
    const text = words.map(maptostring).join('')
    gadgettext(chip, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    gadgethyperlink(chip, label, input, words)
    return 0
  })
