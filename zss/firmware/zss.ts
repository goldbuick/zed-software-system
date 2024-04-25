import { createfirmware } from 'zss/firmware'
import {
  gadgetcheckscroll,
  gadgetcheckset,
  gadgetpanel,
} from 'zss/gadget/data/api'
import { PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import {
  memorycreateeditframe,
  memorycreateviewframe,
  memoryreadchip,
  memoryresetframes,
  memorysetbook,
} from 'zss/memory'
import { boardelementapplycolor, boardcreate } from 'zss/memory/board'
import { createbook } from 'zss/memory/book'
import { createcodepage } from 'zss/memory/codepage'

import { ARG_TYPE, COLLISION, COLOR, readargs } from './wordtypes'

export const ZSS_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set(chip, name, value) {
    // we monitor changes on shared values here
    gadgetcheckset(chip, name, value)
    // return has unhandled
    return [false, undefined]
  },
  shouldtick() {},
  tick(chip) {
    const memory = memoryreadchip(chip.id())
    const withname = memory.target?.name ?? memory.target?.kind ?? 'Scroll'
    gadgetpanel(chip, 'scroll', PANEL_TYPE.SCROLL, undefined, withname)
  },
  tock(chip) {
    gadgetcheckscroll(chip)
  },
})
  .command('color', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs({ ...memory, chip, words }, 0, [ARG_TYPE.COLOR])
    if (ispresent(memory.target) && ispresent(value)) {
      boardelementapplycolor(memory.target, value)
    }
    return 0
  })
  .command('gadget', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const context = { ...memory, chip, words }

    const [edge] = readargs(context, 0, [ARG_TYPE.STRING])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    if (edgeConst === PANEL_TYPE.SCROLL) {
      const [, name, size] = readargs(context, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_STRING,
        ARG_TYPE.MAYBE_NUMBER,
      ])
      gadgetpanel(chip, edge, edgeConst, size, name)
    } else {
      const [, size, name] = readargs(context, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_NUMBER,
        ARG_TYPE.MAYBE_STRING,
      ])
      gadgetpanel(chip, edge, edgeConst, size, name)
    }

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
              board: boardcreate((board) => {
                // console.info(board)
                // todo, make it so you can clone an existing book
                return board
              }),
            }),
            createcodepage('@terrain dirt', {
              terrain: {
                char: 176,
                bg: COLOR.BLACK,
                color: COLOR.DKYELLOW,
                collision: COLLISION.WALK,
              },
            }),
            createcodepage('@terrain dirt2', {
              terrain: {
                char: 176,
                bg: COLOR.BLACK,
                color: COLOR.DKGRAY,
                collision: COLLISION.WALK,
              },
            }),
            createcodepage('@terrain wall', {
              terrain: {
                char: 177,
                bg: COLOR.DKGREEN,
                color: COLOR.GREEN,
                collision: COLLISION.SOLID,
              },
            }),
            createcodepage('@terrain wall2', {
              terrain: {
                char: 176,
                bg: COLOR.DKGREEN,
                color: COLOR.GREEN,
                collision: COLLISION.SOLID,
              },
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
