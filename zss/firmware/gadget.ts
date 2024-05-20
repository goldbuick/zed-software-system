import { maptostring } from 'zss/chip'
import { createfirmware } from 'zss/firmware'
import {
  gadgetcheckscroll,
  gadgetcheckset,
  gadgethyperlink,
  gadgetpanel,
  gadgettext,
} from 'zss/gadget/data/api'
import { PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import {
  memorycreateeditframe,
  memorycreateviewframe,
  memoryreadchip,
  memoryreadcontext,
  memoryresetframes,
} from 'zss/memory'

import { ARG_TYPE, readargs } from './wordtypes'

export const GADGET_FIRMWARE = createfirmware({
  get() {
    return [false, undefined]
  },
  set(chip, name, value) {
    // how about we split this out into gadget firmware
    // we monitor changes on shared values here
    gadgetcheckset(chip, name, value)
    // return has unhandled
    return [false, undefined]
  },
  shouldtick() {},
  tick(chip) {
    const memory = memoryreadchip(chip.id())

    let withname = 'scroll'
    if (ispresent(memory.object?.name)) {
      withname = memory.object.name
    }

    gadgetpanel(chip, 'scroll', PANEL_TYPE.SCROLL, undefined, withname)
  },
  tock(chip) {
    gadgetcheckscroll(chip)
  },
})
  // gadget output & ui
  .command('gadget', (chip, words) => {
    const context = memoryreadcontext(chip, words)

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
  .command('frame', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [maybetarget, maybetype, maybeboard] = readargs(
      memoryreadcontext(chip, words),
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
          break
      }
    }

    return 0
  })
  .command('text', (chip, words) => {
    const text = words.map(maptostring).join('')
    gadgettext(chip, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    gadgethyperlink(chip, label, input, words)
    return 0
  })
