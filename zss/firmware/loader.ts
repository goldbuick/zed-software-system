import {
  BINARY_READER,
  JSON_READER,
  TEXT_READER,
  REXPAINT_READER,
  api_log,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { pick } from 'zss/mapping/array'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memorysendtoactiveboards } from 'zss/memory'
import { bookreadcodepagesbytypeandstat } from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import { memoryloadercontent, memoryloaderformat } from 'zss/memory/loader'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'

import { loaderbinary } from './loaderbinary'
import { loaderjson } from './loaderjson'
import { loaderrexpaint } from './loaderrexpaint'
import { loadertext } from './loadertext'

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
      case 'rexpaint': {
        const rexpaintreader: REXPAINT_READER = memoryloadercontent(chip.id())
        switch (name) {
          case 'filename':
            return [true, rexpaintreader.filename]
          case 'layers':
            return [true, rexpaintreader.content?.layers.length ?? 0]
          case 'width':
            return [
              true,
              rexpaintreader.content?.layers[rexpaintreader.cursor].width ?? 0,
            ]
          case 'height':
            return [
              true,
              rexpaintreader.content?.layers[rexpaintreader.cursor].height ?? 0,
            ]
          case 'cursor':
            return [true, rexpaintreader.cursor]
        }
        break
      }
    }
    return [false, undefined]
  },
})
  .command('send', (_, words) => {
    const send = parsesend(words)
    if (ispresent(send.targetdir)) {
      memorysendtoactiveboards(send.targetdir.destpt, send.data)
    } else if (ispresent(send.targetname)) {
      memorysendtoactiveboards(send.targetname, send.data)
    }
    return 0
  })
  .command('stat', () => {
    // no-op
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    api_log(SOFTWARE, READ_CONTEXT.elementfocus, '$175', text)
    return 0
  })
  .command('hyperlink', (_, args) => {
    const [labelword, ...words] = args
    const label = maptostring(labelword)
    const hyperlink = words.map(maptostring).join(' ')
    api_log(
      SOFTWARE,
      READ_CONTEXT.elementfocus,
      '$175',
      `!${hyperlink};${label}`,
    )
    return 0
  })
  .command('readline', loadertext)
  .command('readjson', loaderjson)
  .command('readbin', loaderbinary)
  .command('readrexpaint', loaderrexpaint)
  .command('with', (_, words) => {
    const [stat] = readargs(words, 0, [ARG_TYPE.NAME])
    // this will update the READ_CONTEXT so element centric
    // commands will work
    const boards = bookreadcodepagesbytypeandstat(
      READ_CONTEXT.book,
      CODE_PAGE_TYPE.BOARD,
      stat,
    )
    if (boards.length) {
      const target = pick(...boards)
      if (ispresent(target)) {
        READ_CONTEXT.board = codepagereaddata<CODE_PAGE_TYPE.BOARD>(target)
        // -1, -1 means RANDOM
        READ_CONTEXT.element = {
          x: -1,
          y: -1,
        }
      }
    }
    return 0
  })
