import { createfirmware } from 'zss/firmware'
import { gadgetcheckset, gadgetpanel } from 'zss/gadget/data/api'
import { PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { isdefined } from 'zss/mapping/types'
import { memoryreadchip } from 'zss/memory'

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
