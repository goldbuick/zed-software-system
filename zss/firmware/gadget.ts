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
import { memoryreadchip, memoryreadcontext } from 'zss/memory'

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

    gadgetpanel(memory.player, 'scroll', PANEL_TYPE.SCROLL, undefined, withname)
  },
  tock(chip) {
    const memory = memoryreadchip(chip.id())
    gadgetcheckscroll(memory.player)
  },
})
  // gadget output & ui
  .command('gadget', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const context = memoryreadcontext(chip, words)

    const [edge] = readargs(context, 0, [ARG_TYPE.STRING])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    if (edgeConst === PANEL_TYPE.SCROLL) {
      const [, name, size] = readargs(context, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_STRING,
        ARG_TYPE.MAYBE_NUMBER,
      ])
      gadgetpanel(memory.player, edge, edgeConst, size, name)
    } else {
      const [, size, name] = readargs(context, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_NUMBER,
        ARG_TYPE.MAYBE_STRING,
      ])
      gadgetpanel(memory.player, edge, edgeConst, size, name)
    }

    return 0
  })
  .command('text', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const text = words.map(maptostring).join('')
    gadgettext(memory.player, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    const memory = memoryreadchip(chip.id())
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    gadgethyperlink(memory.player, chip, label, input, words)
    return 0
  })
