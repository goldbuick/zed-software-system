import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import { createsid } from 'zss/mapping/guid'
import { MEMORY_LABEL, memoryensuresoftwarebook } from 'zss/memory'
import { memoryloadercontent, memoryloaderevent } from 'zss/memory/loader'
import { BINARY_READER, TEXT_READER } from 'zss/memory/types'
import { ARG_TYPE, readargs } from 'zss/words/reader'

import { binaryloader } from './loader/binaryloader'
import { textloader } from './loader/textloader'

export const LOADER_FIRMWARE = createfirmware({
  get(chip, name) {
    const type = memoryloaderevent(chip.id())
    switch (type) {
      case 'chat': {
        const textreader: TEXT_READER = memoryloadercontent(chip.id())
        switch (name) {
          case 'filename':
            return [true, textreader.filename]
          case 'cursor':
            return [true, textreader.cursor]
          case 'lines':
            return [true, textreader.lines.length]
        }
        break
      }
      case 'binary': {
        const binaryreader: BINARY_READER = memoryloadercontent(chip.id())
        switch (name) {
          case 'filename':
            return [true, binaryreader.filename]
          case 'cursor':
            return [true, binaryreader.cursor]
          case 'bytes':
            return [true, binaryreader.bytes.length]
        }
        break
      }
    }
    return [false, undefined]
  },
})
  // primary firmware
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
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info('$2', `!${hyperlink};${label}`)
    return 0
  })
  // ---
  .command('load', (chip, words) => {
    const maybename = words.map(maptostring).join(' ')
    const name = chip.get(maybename) ?? maybename
    memoryensuresoftwarebook(MEMORY_LABEL.CONTENT, name)
    return 0
  })
  .command('reload', (chip, words) => {
    const maybename = words.map(maptostring).join(' ')
    const name = chip.get(maybename) ?? maybename
    const contentbook = memoryensuresoftwarebook(MEMORY_LABEL.CONTENT, name)
    // delete all codepages
    contentbook.pages = []
    return 0
  })
  .command('bin', binaryloader)
  .command('txt', textloader)
