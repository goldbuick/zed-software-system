import { createfirmware } from 'zss/firmware'

import { maptostring } from '../chip'
import {
  gadgetcheckset,
  gadgetpanel,
  gadgettext,
  gadgethyperlink,
} from '../gadget/data/api'
import { PANEL_TYPE, PANEL_TYPE_MAP } from '../gadget/data/types'

export const ZSS_FIRMWARE = createfirmware(
  () => {
    return [false, undefined]
  },
  (chip, name, value) => {
    gadgetcheckset(chip, name, value)
    return [false, undefined]
  },
)
  .command('stat', (chip, words) => {
    const parts = words.map(chip.tpi)
    chip.setName(parts.join(' '))
    return 0
  })
  .command('gadget', (chip, args) => {
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
  .command('text', (chip, args) => {
    const text = maptostring(args[0] ?? '')

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
