import {
  BINARY_READER,
  JSON_READER,
  TEXT_READER,
  api_chat,
  api_log,
  register_input,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { createfirmware } from 'zss/firmware'
import { INPUT } from 'zss/gadget/data/types'
import { ispid } from 'zss/mapping/guid'
import { randominteger, randomnumber } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memoryboardread, memoryreadoperator } from 'zss/memory'
import { boardobjectread } from 'zss/memory/board'
import { memoryloadercontent, memoryloaderformat } from 'zss/memory/loader'
import { memorysendtoelements } from 'zss/memory/send'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'
import { ARG_TYPE, READ_CONTEXT, readargs } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'
import { NAME } from 'zss/words/types'

import { loaderbinary } from './loaderbinary'
import { loaderjson } from './loaderjson'
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
    }

    // return as unhandled
    return [false, undefined]
  },
})
  .command('endgame', () => {
    // no-op when called in loaders
    return 0
  })
  .command('shortsend', (chip, words) => {
    const send = parsesend(words)
    memorysendtoelements(chip, READ_CONTEXT.element, send)
    return 0
  })
  .command('send', (chip, words) => {
    const send = parsesend(words, true)
    memorysendtoelements(chip, READ_CONTEXT.element, send)
    return 0
  })
  .command('stat', () => {
    // no-op
    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join(' ')
    api_chat(SOFTWARE, '', '$GREEN', text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    const [label, ...words] = args
    const labelstr = chip.template(maptostring(label).split(' '))
    api_chat(SOFTWARE, '', `!${chip.template(words)};${labelstr}`)
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
      READ_CONTEXT.element = {
        x: randominteger(0, BOARD_WIDTH - 1),
        y: randominteger(0, BOARD_HEIGHT - 1),
      }
    }
    return 0
  })
  .command('withobject', (_, words) => {
    // the idea here is we can give an object id
    // and it'll update the READ_CONTEXT to point to the given object
    // the intent here is afford !chat to drive behavior of a __specific__ object
    const [id] = readargs(words, 0, [ARG_TYPE.STRING])
    const maybeobject = boardobjectread(READ_CONTEXT.board, id)
    // #oneof chatuser chatdroid
    // #withobject chatuser
    // #goup ' <- this code
    if (ispresent(maybeobject)) {
      // write context
      READ_CONTEXT.element = maybeobject
      READ_CONTEXT.elementid = maybeobject.id ?? ''
      READ_CONTEXT.elementisplayer = ispid(READ_CONTEXT.elementid)
      READ_CONTEXT.elementfocus = READ_CONTEXT.elementisplayer
        ? READ_CONTEXT.elementid
        : (READ_CONTEXT.element.player ?? memoryreadoperator())
    }
    return 0
  })
  .command('userinput', (_, words) => {
    const [action] = readargs(words, 0, [ARG_TYPE.NAME])
    const player = memoryreadoperator()
    switch (NAME(action)) {
      case 'up':
        register_input(SOFTWARE, player, INPUT.MOVE_UP, false)
        break
      case 'down':
        register_input(SOFTWARE, player, INPUT.MOVE_DOWN, false)
        break
      case 'left':
        register_input(SOFTWARE, player, INPUT.MOVE_RIGHT, false)
        break
      case 'right':
        register_input(SOFTWARE, player, INPUT.MOVE_RIGHT, false)
        break
      case 'shootup':
        register_input(SOFTWARE, player, INPUT.MOVE_UP, true)
        break
      case 'shootdown':
        register_input(SOFTWARE, player, INPUT.MOVE_DOWN, true)
        break
      case 'shootleft':
        register_input(SOFTWARE, player, INPUT.MOVE_RIGHT, true)
        break
      case 'shootright':
        register_input(SOFTWARE, player, INPUT.MOVE_RIGHT, true)
        break
      case 'ok':
        register_input(SOFTWARE, player, INPUT.OK_BUTTON, false)
        break
      case 'cancel':
        register_input(SOFTWARE, player, INPUT.CANCEL_BUTTON, false)
        break
    }
    return 0
  })
