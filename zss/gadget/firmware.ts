import { createFirmware } from 'zss/lang'

import { ARG, STATE } from '../lang/chip'
import { createGuid } from '../mapping/guid'

import { PANEL, PANEL_EDGE, PANEL_EDGE_MAP } from './data'

const sharedState: STATE = {}

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

    // default state
    defaultState(sharedState)

    // find slot
    const panel = findPanel(sharedState)

    // add text
    if (sharedState.layoutReset) {
      sharedState.layoutReset = false
      panel.text = []
    }
    panel.text.push(text)

    return 0
  })
  .command('hyperlink', (state, chip, args) => {
    const [target, label, input] = chip.mapArgs(
      args,
      1,
      ARG.STRING,
      ARG.STRING,
      ARG.STRING,
    ) as [string, string, string]

    // default state
    defaultState(sharedState)

    // find slot
    const panel = findPanel(sharedState)

    // add hypertext
    if (sharedState.layoutReset) {
      sharedState.layoutReset = false
      panel.text = []
    }
    panel.text.push([target, label, input])

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
    defaultState(sharedState)

    const panelState: PANEL | undefined = sharedState.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      sharedState.layoutReset = true
      sharedState.layoutFocus = panelName
    } else {
      switch (edgeConst) {
        case PANEL_EDGE.START:
          initState(sharedState)
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
          sharedState.layout.push(panel)
          sharedState.layoutFocus = panelName
          break
        default:
          // todo: raise runtime error
          // probably make a chip api to do it
          break
      }
    }

    return 0
  })
