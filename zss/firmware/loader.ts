import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { createsid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import {
  memoryensuresoftwarebook,
  memoryreadchip,
  memoryreadcontext,
} from 'zss/memory'
import { bookreadflag, booksetflag } from 'zss/memory/book'

import { binaryloader } from './loader/binaryloader'
import { ARG_TYPE, readargs } from './wordtypes'

export const LOADER_FIRMWARE = createfirmware({
  get(chip, name) {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory)) {
      return [false, undefined]
    }

    switch (name.toLowerCase()) {
      case 'filename':
        if (ispresent(memory.binaryfile?.filename)) {
          // name of binary file
          return [true, memory.binaryfile.filename]
        }
        break
      case 'cursor':
        if (ispresent(memory.binaryfile?.cursor)) {
          // return where we are in the binary file ?
          return [true, memory.binaryfile.cursor]
        }
        break
    }

    // get player's flags
    const value = bookreadflag(memory.book, memory.player, name)
    // console.info('get', name, value)
    return [ispresent(value), value]
  },
  set(chip, name, value) {
    const memory = memoryreadchip(chip.id())
    if (!ispresent(memory)) {
      return [false, undefined]
    }

    // set player's flags
    booksetflag(memory.book, memory.player, name, value)
    // console.info('set', name, value)
    return [true, value]
  },
  shouldtick() {},
  tick() {},
  tock() {},
})
  .command('stat', () => {
    // no-op
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    tape_info('$2', text)
    return 0
  })
  .command('hyperlink', (_, args) => {
    // const memory = memoryreadchip(chip.id())
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${label}`)
    return 0
  })
  .command('load', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [maybename] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.MAYBE_STRING,
    ])
    // set running loader's book via #load
    const name = maybename ?? ''
    memory.book = memoryensuresoftwarebook('content', chip.get(name) ?? name)
    return 0
  })
  .command('bin', binaryloader)
  /**
   * TODO loaders, textloader, jsonloader, imageloader, xmlloader
   * common text parsing ??
   */
  .command('send', (chip, words) => {
    const [target, data] = readargs(memoryreadcontext(chip, words), 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.ANY,
    ])
    chip.message({
      id: createsid(),
      sender: chip.id(),
      target,
      data,
    })
    return 0
  })
