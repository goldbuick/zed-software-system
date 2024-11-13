import { maptostring } from 'zss/chip'
import { tape_info } from 'zss/device/api'
import { createfirmware } from 'zss/firmware'
import {
  gadgetcheckscroll,
  gadgetcheckset,
  gadgethyperlink,
  gadgetpanel,
  gadgettext,
} from 'zss/gadget/data/api'
import { COLOR, PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory'
import { bookelementdisplayread } from 'zss/memory/book'

import { ARG_TYPE, READ_CONTEXT, readargs } from './wordtypes'

export const GADGET_FIRMWARE = createfirmware({
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
  tick() {
    let withname = 'scroll'
    if (ispresent(READ_CONTEXT.element?.name)) {
      withname = READ_CONTEXT.element.name
    }
    gadgetpanel(
      READ_CONTEXT.player,
      'scroll',
      PANEL_TYPE.SCROLL,
      undefined,
      withname,
    )
  },
  tock() {
    const ticker = gadgetcheckscroll(READ_CONTEXT.player)
    if (ticker && ispresent(READ_CONTEXT.element)) {
      READ_CONTEXT.element.tickertext = ticker
      READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
      // send message
      const display = bookelementdisplayread(
        READ_CONTEXT.book,
        READ_CONTEXT.element,
      )
      tape_info(`$${COLOR[display.color]}$${display.char}`, ticker)
    }
  },
})
  // gadget output & ui
  .command('gadget', (chip) => {
    const flags = memoryreadflags(chip.id())
    if (!isstring(flags.player)) {
      return 0
    }

    const [edge] = readargs(0, [ARG_TYPE.STRING])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    if (edgeConst === PANEL_TYPE.SCROLL) {
      const [, name, size] = readargs(0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_STRING,
        ARG_TYPE.MAYBE_NUMBER,
      ])
      gadgetpanel(flags.player, edge, edgeConst, size, name)
    } else {
      const [, size, name] = readargs(0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_NUMBER,
        ARG_TYPE.MAYBE_STRING,
      ])
      gadgetpanel(flags.player, edge, edgeConst, size, name)
    }

    return 0
  })
  .command('text', (_, words) => {
    const text = words.map(maptostring).join('')
    gadgettext(READ_CONTEXT.player, text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // package into a panel item
    const [labelword, inputword, ...words] = args
    const label = maptostring(labelword)
    const input = maptostring(inputword)
    gadgethyperlink(READ_CONTEXT.player, chip, label, input, words)
    return 0
  })
