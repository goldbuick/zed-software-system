import { createFirmware } from 'zss/lang'

import { createGuid } from '../mapping/guid'

import { PANEL, PANEL_EDGE, PANEL_EDGE_MAP } from './data'

export const GadgetFirmware = createFirmware('gadget')
  .command('get', (state, chip, args) => {
    const name = chip.wordToString(args[0])
    return state[name] ?? 0
  })
  .command('set', (state, chip, args) => {
    const name = chip.wordToString(args[0])
    state[name] = args[1]
    return 0
  })
  .command('gadget', (state, chip, args) => {
    const edge = chip.wordToString(args[0])
    const size = chip.evalToNumber(args[1])
    const name = chip.wordToString(args[2])

    const edgeConst = PANEL_EDGE_MAP[`${edge}`.toLowerCase()]

    switch (edgeConst) {
      case PANEL_EDGE.START:
        state.layout = undefined
        state.layoutPanel = undefined
        break
      case PANEL_EDGE.LEFT:
      case PANEL_EDGE.RIGHT:
      case PANEL_EDGE.TOP:
      case PANEL_EDGE.BOTTOM: {
        const panel: PANEL = {
          id: createGuid(),
          name: name || edge,
          edge: edgeConst,
          size,
          next: undefined,
        }
        if (state.layoutPanel) {
          // chain onto prior panel ??
          // why not just make this a list ??
          state.layoutPanel.next = panel
          state.layoutPanel = panel
        } else {
          state.layout = panel
          state.layoutPanel = panel
        }
        break
      }
      default:
        // todo: raise runtime error
        // probably make a chip api to do it
        break
    }

    return 0
  })
