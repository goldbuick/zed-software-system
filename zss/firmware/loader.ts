import { maptostring } from 'zss/chip'
import {
  BINARY_READER,
  JSON_READER,
  tape_info,
  TEXT_READER,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { memorysendtoactiveboards } from 'zss/memory'
import { memoryloadercontent, memoryloaderformat } from 'zss/memory/loader'
import { ARG_TYPE, readargs } from 'zss/words/reader'

import { binaryloader } from './loader/binaryloader'
import { jsonloader } from './loader/jsonloader'
import { textloader } from './loader/textloader'

export const LOADER_FIRMWARE = createfirmware({
  get(chip, name) {
    const type = memoryloaderformat(chip.id())
    if (name === 'format') {
      return [true, type]
    }
    switch (type) {
      case 'text': {
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
      case 'json': {
        const jsonreader: JSON_READER = memoryloadercontent(chip.id())
        switch (name) {
          case 'filename':
            return [true, jsonreader.filename]
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
  .command('send', (_, words) => {
    const [target, data] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
    memorysendtoactiveboards(target, data)
    return 0
  })
  .command('stat', () => {
    // no-op
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    tape_info(SOFTWARE, '$175', text)
    return 0
  })
  .command('hyperlink', (_, args) => {
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    tape_info(SOFTWARE, '$175', `!${hyperlink};${label}`)
    return 0
  })
  .command('txt', textloader)
  .command('json', jsonloader)
  .command('bin', binaryloader)
