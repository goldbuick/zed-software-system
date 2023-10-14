import { createFirmware } from 'zss/lang'

import { ARG } from '../lang/chip'
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
  .command('text', (state, chip, args) => {
    const [text] = chip.mapArgs(args, ARG.STRING) as [string]

    if (!state.layout) {
      state.layout = []
      state.layoutReset = true
      state.layoutFocus = 'scroll'
    }

    const panel = state.layout.find(
      (panel: PANEL) => panel.name === state.layoutFocus,
    )

    if (!panel) {
      const newPanel: PANEL = {
        id: createGuid(),
        name: state.layoutFocus,
        edge: PANEL_EDGE.RIGHT,
        size: 20,
        text: [text],
      }
      state.layout.push(newPanel)
      state.layoutReset = false
      return 0
    }

    if (state.layoutReset) {
      state.layoutReset = false
      panel.text = [text]
    } else {
      panel.text.push(text)
    }

    return 0
  })
  .command('gadget', (state, chip, args) => {
    const [edge, size, name] = chip.mapArgs(
      args,
      ARG.STRING,
      ARG.NUMBER,
      ARG.STRING,
    ) as [string, number, string]

    const panelName = name || edge
    const edgeConst = PANEL_EDGE_MAP[`${edge}`.toLowerCase()]

    // default state
    if (!state.layout) {
      state.layout = []
      state.layoutReset = true
      state.layoutFocus = 'scroll'
    }

    const panelState: PANEL | undefined = state.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      state.layoutReset = true
      state.layoutFocus = panelName
    } else {
      switch (edgeConst) {
        case PANEL_EDGE.START:
          state.layout = []
          state.layoutReset = true
          state.layoutFocus = 'scroll'
          break
        case PANEL_EDGE.LEFT:
        case PANEL_EDGE.RIGHT:
        case PANEL_EDGE.TOP:
        case PANEL_EDGE.BOTTOM:
        case PANEL_EDGE.SCROLL:
          const panel: PANEL = {
            id: createGuid(),
            name: panelName,
            edge: edgeConst,
            size,
            text: [],
          }
          state.layout.push(panel)
          state.layoutFocus = panelName
          break
        default:
          // todo: raise runtime error
          // probably make a chip api to do it
          break
      }
    }

    return 0
  })
