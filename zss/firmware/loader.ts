import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { createsid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memoryreadbinaryfile,
  memoryreadflags,
} from 'zss/memory'

import { binaryloader } from './loader/binaryloader'
import { ARG_TYPE, READ_CONTEXT, readargs } from './wordtypes'

export const LOADER_FIRMWARE = createfirmware({
  get(chip, name) {
    const binaryfile = memoryreadbinaryfile(chip.id())
    if (ispresent(binaryfile)) {
      switch (name.toLowerCase()) {
        case 'filename':
          // name of binary file
          return [ispresent(binaryfile.filename), binaryfile.filename]
        case 'cursor':
          // return where we are in the binary file ?
          return [ispresent(binaryfile.cursor), binaryfile.cursor]
      }
    }

    // check player's flags
    const value = memoryreadflags(READ_CONTEXT.player)[name]
    return [ispresent(value), value]
  },
  set(_, name, value) {
    // set player's flags
    const flags = memoryreadflags(READ_CONTEXT.player)
    flags[name] = value
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
    const maybename = words.map(maptostring).join(' ')
    const name = chip.get(maybename) ?? maybename
    memoryensuresoftwarebook(MEMORY_LABEL.CONTENT, name)
    return 0
  })
  .command('reload', (chip, words) => {
    const maybename = words.map(maptostring).join(' ')
    const name = chip.get(maybename) ?? maybename
    const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.CONTENT, name)
    // delete all codepages
    mainbook.pages = []
    return 0
  })
  .command('bin', binaryloader)
  /**
   * TODO loaders, textloader, jsonloader, imageloader, xmlloader
   * common text parsing ??
   */
  .command('send', (chip, words) => {
    const [target, data] = readargs(words, 0, [ARG_TYPE.STRING, ARG_TYPE.ANY])
    chip.message({
      id: createsid(),
      sender: chip.id(),
      target,
      data,
    })
    return 0
  })
