import { PANEL, PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data'
import { createGuid } from 'zss/mapping/guid'
import { ARG, STATE } from 'zss/system/chip'

import { createFirmware } from '../firmware'

function initState(state: STATE) {
  state.layout = []
  state.layoutReset = true
  state.layoutFocus = 'scroll'
}

function findPanel(state: STATE): PANEL {
  // find slot
  const panel = state.layout.find(
    (panel: PANEL) => panel.name === state.layoutFocus,
  )

  if (!panel) {
    const newPanel: PANEL = {
      id: createGuid(),
      name: state.layoutFocus,
      edge: PANEL_TYPE.RIGHT,
      size: 20,
      text: [],
    }
    state.layout.push(newPanel)
    state.layoutReset = false
    return newPanel
  }

  return panel
}

export const GADGET_FIRMWARE = createFirmware('gadget')
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

    // find slot
    const panel = findPanel(GADGET_FIRMWARE.shared)

    // add text
    if (GADGET_FIRMWARE.shared.layoutReset) {
      GADGET_FIRMWARE.shared.layoutReset = false
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

    // find slot
    const panel = findPanel(GADGET_FIRMWARE.shared)

    // add hypertext
    if (GADGET_FIRMWARE.shared.layoutReset) {
      GADGET_FIRMWARE.shared.layoutReset = false
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
    const edgeConst = PANEL_TYPE_MAP[`${edge}`.toLowerCase()]

    const panelState: PANEL | undefined = GADGET_FIRMWARE.shared.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      GADGET_FIRMWARE.shared.layoutReset = true
      GADGET_FIRMWARE.shared.layoutFocus = panelName
    } else {
      switch (edgeConst) {
        case PANEL_TYPE.START:
          initState(GADGET_FIRMWARE.shared)
          break
        case PANEL_TYPE.LEFT:
        case PANEL_TYPE.RIGHT:
        case PANEL_TYPE.TOP:
        case PANEL_TYPE.BOTTOM:
        case PANEL_TYPE.SCROLL:
          const panel: PANEL = {
            id: createGuid(),
            name: panelName,
            edge: edgeConst,
            size,
            text: [],
          }
          GADGET_FIRMWARE.shared.layout.push(panel)
          GADGET_FIRMWARE.shared.layoutFocus = panelName
          break
        default:
          // todo: raise runtime error
          // probably make a chip api to do it
          break
      }
    }

    return 0
  })

initState(GADGET_FIRMWARE.shared)
