import { maptostring } from 'zss/chip'
import { api_error, register_read, register_write } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { isnumber } from 'zss/mapping/types'
import { memoryreadchip, memoryreadcontext, memorysetbook } from 'zss/memory'
import { createbook } from 'zss/memory/book'

import { ARG_TYPE, readargs } from './wordtypes'

export const ALL_FIRMWARE = createfirmware({
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
  // memory state
  .command('book', (chip, words) => {
    const [maybetarget, maybeaction] = readargs(
      memoryreadcontext(chip, words),
      0,
      [ARG_TYPE.STRING, ARG_TYPE.STRING],
    )

    const ltarget = maybetarget.toLowerCase()
    const laction = maybeaction.toLowerCase()
    switch (laction) {
      case 'create':
        memorysetbook(createbook(ltarget, []))
        break
      default:
        // TODO raise error of unknown action
        break
    }

    return 0
  })
  // app state (in-url)
  .command('register', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const maybeplayer = memory.object?.stats?.player ?? ''
    const [action, name] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.STRING,
    ])
    switch (action.toLowerCase()) {
      case 'read':
        register_read(chip.senderid(), name, maybeplayer)
        break
      case 'write':
        register_write(chip.senderid(), name, chip.get(name), maybeplayer)
        break
      default:
        api_error(
          chip.senderid(),
          'register',
          `unknown #regsiter [action] ${action}`,
          maybeplayer,
        )
        break
    }
    return 0
  })
  // flags
  .command('clear', (chip, words) => {
    const name = maptostring(words[0])
    chip.set(name, undefined)
    return 0
  })
  .command('set', (chip, words) => {
    const [name, value] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])
    chip.set(name, value)
    return 0
  })
  .command('take', (chip, words) => {
    const [name, maybevalue, ii] = readargs(memoryreadcontext(chip, words), 0, [
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
    const [name, maybevalue, ii] = readargs(memoryreadcontext(chip, words), 0, [
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
  // lifecycle
  .command('idle', (chip) => {
    chip.yield()
    return 0
  })
  .command('end', (chip) => {
    // future, this will also afford giving a return value #end <value>
    chip.endofprogram()
    return 0
  })
  // message mangement
  .command('lock', (chip) => {
    chip.lock(chip.id())
    return 0
  })
  .command('restore', (chip, words) => {
    chip.restore(maptostring(words[0]))
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
