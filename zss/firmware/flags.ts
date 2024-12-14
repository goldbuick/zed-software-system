import { maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import { isnumber } from 'zss/mapping/types'
import { ARG_TYPE, readargs } from 'zss/words/reader'

export const FLAGS_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set() {
    return [false, undefined]
  },
  shouldtick() {},
  tick() {},
  tock() {},
})
  .command('clear', (chip, words) => {
    words.forEach((word) => chip.set(maptostring(word), 0))
    return 0
  })
  .command('set', (chip, words) => {
    const [name, value] = readargs(words, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])
    chip.set(name, value)
    return 0
  })
  .command('take', (chip, words) => {
    const [name, maybevalue, ii] = readargs(words, 0, [
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
  .command('give', (chip, words) => {
    const [name, maybevalue, ii] = readargs(words, 0, [
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
