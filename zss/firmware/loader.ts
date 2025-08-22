import {
  BINARY_READER,
  JSON_READER,
  TEXT_READER,
  api_log,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import {
  MEMORY_LABEL,
  memoryboardread,
  memoryreadbookbysoftware,
  memoryreadflags,
  memoryreadoperator,
  memorysendtoboards,
} from 'zss/memory'
import { bookplayerreadboards } from 'zss/memory/bookplayer'
import { memoryloadercontent, memoryloaderformat } from 'zss/memory/loader'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { SEND_META, parsesend } from 'zss/words/send'

import { loaderbinary } from './loaderbinary'
import { loaderjson } from './loaderjson'
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
    }

    // we use operator flags
    const player = memoryreadoperator()
    const value = memoryreadflags(player)[name]
    return [ispresent(value), value]
  },
  set(chip, name, value) {
    const type = memoryloaderformat(chip.id())
    if (name === 'format') {
      // return has unhandled
      return [false, undefined]
    }
    switch (type) {
      case 'text':
        switch (name) {
          case 'filename':
          case 'cursor':
          case 'lines':
            // return has unhandled
            return [false, undefined]
        }
        break
      case 'json':
        switch (name) {
          case 'filename':
            // return has unhandled
            return [false, undefined]
        }
        break
      case 'binary':
        switch (name) {
          case 'filename':
          case 'cursor':
          case 'bytes':
            // return has unhandled
            return [false, undefined]
        }
        break
    }

    // we use operator flags
    const player = memoryreadoperator()
    const flags = memoryreadflags(player)
    if (ispresent(flags)) {
      flags[name] = value
      return [true, value]
    }

    // return has unhandled
    return [false, undefined]
  },
})
  .command('shortsend', (_, words) => {
    const send = parsesend(words)
    handlesend(send)
    return 0
  })
  .command('send', (_, words) => {
    const send = parsesend(words, true)
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
  .command('withboard', (_, words) => {
    const [stat] = readargs(words, 0, [ARG_TYPE.STRING])
    // this will update the READ_CONTEXT so element centric
    // commands will work
    const target = memoryboardread(stat)
    if (ispresent(target)) {
      READ_CONTEXT.board = target
      // -1, -1 means RANDOM
      READ_CONTEXT.element = {
        x: -1,
        y: -1,
      }
    }
    return 0
  })
