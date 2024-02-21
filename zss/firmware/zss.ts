import { isDefined } from 'ts-extras'
import { createfirmware } from 'zss/firmware'
import { memoryreadchip } from 'zss/memory'

import { maptostring } from '../chip'
import { gadgetcheckset, gadgetpanel } from '../gadget/data/api'
import { PANEL_TYPE, PANEL_TYPE_MAP } from '../gadget/data/types'

import { ARG_TYPE, readargs, readnumber } from './wordtypes'

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
    const [value] = readargs(chip, words, [ARG_TYPE.COLOR])
    if (isDefined(memory.target)) {
      memory.target.bg = value
    }
    return 0
  })
  .command('color', (chip, words) => {
    const memory = memoryreadchip(chip.id())
    const [value] = readargs(chip, words, [ARG_TYPE.COLOR])
    if (isDefined(memory.target)) {
      memory.target.color = value
    }
    return 0
  })
  .command('gadget', (chip, words) => {
    const edge = maptostring(words[0])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    const isScroll = edgeConst === PANEL_TYPE.SCROLL

    const arg1 = words[isScroll ? 2 : 1]
    const arg2 = words[isScroll ? 1 : 2]
    const args = [arg1, arg2]
    const [size] = readnumber(chip, args, 0)
    const name = maptostring(arg2)

    gadgetpanel(chip, edge, edgeConst, size, name)
    return 0
  })
