import { createGuid } from 'zss/mapping/guid'

import { PANEL, PANEL_EDGE, PANEL_EDGE_MAP } from '/zss/gadget/data'

import { ARG } from '/zss/system/chip'

import { createFirmware } from '../firmware'

function initState(state: any) {
  state.layout = []
  state.layoutReset = true
  state.layoutFocus = 'scroll'
}

function defaultState(state: any) {
  if (!state.layout) {
    initState(state)
  }
}

function findPanel(state: any) {
  // find slot
  const panel = state.layout.find(
    (panel: PANEL) => panel.name === state.layoutFocus,
  )

  if (!panel) {
    const newPanel: PANEL = {
      id: createGuid(),
      name: state.layoutFocus,
      edge: PANEL_EDGE.RIGHT,
      size: 20,
      text: [],
    }
    state.layout.push(newPanel)
    state.layoutReset = false
    return newPanel
  }

  return panel
}

export const GadgetFirmware = createFirmware('gadget')
  .command('get', (shared, state, chip, args) => {
    const name = chip.wordToString(args[0])
    return state[name] ?? 0
  })
  .command('set', (shared, state, chip, args) => {
    const name = chip.wordToString(args[0])
    state[name] = args[1]
    return 0
  })
  .command('text', (shared, state, chip, args) => {
    const [text] = chip.mapArgs(args, ARG.STRING) as [string]

    // default state
    defaultState(shared)

    // find slot
    const panel = findPanel(shared)

    // add text
    if (shared.layoutReset) {
      shared.layoutReset = false
      panel.text = []
    }
    panel.text.push(text)

    return 0
  })
  .command('hyperlink', (shared, state, chip, args) => {
    const [target, label, input] = chip.mapArgs(
      args,
      1,
      ARG.STRING,
      ARG.STRING,
      ARG.STRING,
    ) as [string, string, string]

    // default state
    defaultState(shared)

    // find slot
    const panel = findPanel(shared)

    // add hypertext
    if (shared.layoutReset) {
      shared.layoutReset = false
      panel.text = []
    }
    panel.text.push([target, label, input])

    return 0
  })
  .command('gadget', (shared, state, chip, args) => {
    const [edge, size, name] = chip.mapArgs(
      args,
      ARG.STRING,
      ARG.NUMBER,
      ARG.STRING,
    ) as [string, number, string]

    const panelName = name || edge
    const edgeConst = PANEL_EDGE_MAP[`${edge}`.toLowerCase()]

    // default state
    defaultState(shared)

    const panelState: PANEL | undefined = shared.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      shared.layoutReset = true
      shared.layoutFocus = panelName
    } else {
      switch (edgeConst) {
        case PANEL_EDGE.START:
          initState(shared)
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
          shared.layout.push(panel)
          shared.layoutFocus = panelName
          break
        default:
          // todo: raise runtime error
          // probably make a chip api to do it
          break
      }
    }

    return 0
  })
