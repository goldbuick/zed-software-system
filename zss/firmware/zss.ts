import { createfirmware } from 'zss/firmware'
import { gadgetcheckset, gadgetpanel } from 'zss/gadget/data/api'
import { PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { isdefined, ispresent } from 'zss/mapping/types'
import {
  memorycreateeditframe,
  memorycreateviewframe,
  memoryreadchip,
  memoryresetframes,
  memorysetbook,
} from 'zss/memory'
import { createboard } from 'zss/memory/board'
import { createbook } from 'zss/memory/book'
import { createcodepage } from 'zss/memory/codepage'

import { ARG_TYPE, readargs } from './wordtypes'

export const ZSS_FIRMWARE = createfirmware(
  () => {
    return [false, undefined]
  },
  (chip, name, value) => {
    // we monitor changes on shared values here
    gadgetcheckset(chip, name, value)
    // return has unhandled
    return [false, undefined]
  },
)
  .command('bg', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.COLOR])
    if (isdefined(memory.target)) {
      memory.target.bg = value
    }
    return 0
  })
  .command('color', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.COLOR])
    if (isdefined(memory.target)) {
      memory.target.color = value
    }
    return 0
  })
  .command('gadget', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const context = { ...memory, chip, words }

    const [edge, maybesize, maybename] = readargs(context, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.MAYBE_NUMBER,
      ARG_TYPE.MAYBE_STRING,
    ])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]

    gadgetpanel(chip, edge, edgeConst, maybesize, maybename)
    return 0
  })
  .command('book', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [maybetarget, maybeaction] = readargs({ ...memory, chip, words }, 0, [
      ARG_TYPE.STRING,
      ARG_TYPE.STRING,
    ])

    const ltarget = maybetarget.toLowerCase()
    const laction = maybeaction.toLowerCase()
    switch (laction) {
      case 'create':
        memorysetbook(
          createbook(ltarget, [
            createcodepage('@board title', {
              board: createboard((board) => {
                // console.info(board)
                // todo, make it so you can clone an existing book
                return board
              }),
            }),
          ]),
        )
        break
      default:
        // TODO raise error of unknown action
        console.info('book', { ltarget, laction })
        break
    }

    return 0
  })
  .command('frame', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [maybetarget, maybetype, maybeboard] = readargs(
      { ...memory, chip, words },
      0,
      [ARG_TYPE.STRING, ARG_TYPE.MAYBE_STRING, ARG_TYPE.MAYBE_STRING],
    )

    const board = memory.board?.id ?? ''

    const ltarget = maybetarget.toLowerCase()
    if (ltarget === 'reset') {
      memoryresetframes(board)
    } else if (ispresent(maybetype) && ispresent(maybeboard)) {
      const ltype = maybetype.toLowerCase()
      switch (ltype) {
        case 'edit':
          memorycreateeditframe(board, ltarget, maybeboard)
          break
        case 'view':
          memorycreateviewframe(board, ltarget, maybeboard)
          break
        default:
          // TODO raise error of unknown action
          console.info('frame', { ltype, ltarget, maybeboard })
          break
      }
    }

    return 0
  })
