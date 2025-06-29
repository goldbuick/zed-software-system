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
import {
  MEMORY_LABEL,
  memoryreadbookbysoftware,
  memorysendtoboards,
} from 'zss/memory'
import {
  bookplayerreadboards,
  bookreadcodepagesbytypeandstat,
} from 'zss/memory/book'
import { codepagereaddata } from 'zss/memory/codepage'
import { memoryloadercontent, memoryloaderformat } from 'zss/memory/loader'
import { CODE_PAGE_TYPE } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { parsesend, SEND_META } from 'zss/words/send'

import { loaderbinary } from './loaderbinary'
import { loaderjson } from './loaderjson'
import { loaderrexpaint } from './loaderrexpaint'
import { loadertext } from './loadertext'

function handlesend(send: SEND_META) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const boards = bookplayerreadboards(mainbook)
  if (ispresent(send.targetdir)) {
    memorysendtoboards(send.targetdir.destpt, send.label, undefined, boards)
  } else if (ispresent(send.targetname)) {
    memorysendtoboards(send.targetname, send.label, undefined, boards)
  }
}

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
  .command('shortsend', (_, words) => {
    const send = parsesend(words)
    handlesend(send)
    return 0
  })
  .command('send', (_, words) => {
    const send = parsesend(['send', ...words])
    handlesend(send)
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
    const [linkword, ...words] = args
    const linktext = maptostring(linkword)
    const send = parsesend(words)
    if (ispresent(send.targetname)) {
      api_log(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        '$175',
        `!${send.targetname}${send.label};${linktext}`,
      )
    }
    return 0
  })
  .command('readline', loadertext)
  .command('readjson', loaderjson)
  .command('readbin', loaderbinary)
  .command('readrexpaint', loaderrexpaint)
  .command('withboard', (_, words) => {
    const [stat] = readargs(words, 0, [ARG_TYPE.STRING])
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
