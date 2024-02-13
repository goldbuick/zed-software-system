import { createfirmware } from 'zss/firmware'

import { maptostring } from '../chip'
import { gadgetcheckset, gadgetpanel } from '../gadget/data/api'
import { PANEL_TYPE, PANEL_TYPE_MAP } from '../gadget/data/types'

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
).command('gadget', (chip, args) => {
  const edge = maptostring(args[0])
  const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
  const isScroll = edgeConst === PANEL_TYPE.SCROLL

  const arg1 = args[isScroll ? 2 : 1]
  const arg2 = args[isScroll ? 1 : 2]
  const size = chip.tpn(arg1)
  const name = maptostring(arg2)

  gadgetpanel(chip, edge, edgeConst, size, name)
  return 0
})
