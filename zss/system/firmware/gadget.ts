import { LAYER, PANEL, PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { createGuid } from 'zss/mapping/guid'
import { hub } from 'zss/network/hub'
import { ARG, STATE } from 'zss/system/chip'

import { createFirmware } from '../firmware'

export type GADGET_STATE = {
  layers: LAYER[]
  layout: PANEL[]
  layoutReset: boolean
  layoutFocus: string
}

function initState(state: STATE): GADGET_STATE {
  state.layers = []
  state.layout = []
  state.layoutReset = true
  state.layoutFocus = 'scroll'
  return state as GADGET_STATE
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

export function gadgetState(state: STATE, group: string) {
  let value: GADGET_STATE = state[group]

  if (value === undefined) {
    state[group] = value = initState({})
  }

  return value
}

export const GADGET_FIRMWARE = createFirmware()
  .command('parse', (state, chip, args) => {
    console.info('parse', args)
    const [value] = args
    return [chip.evalToNumber(value), 1]
  })
  .command('if', (state, chip, args) => {
    console.info('if', args)
    return 0
  })
  .command('stat', (state, chip, args) => {
    const parts = args.map((arg) => chip.wordToString(arg))
    chip.setName(parts.join(' '))
    return 0
  })
  .command('end', (state, chip) => {
    chip.endofprogram()
    return 0
  })
  .command('send', (state, chip, args) => {
    const target = chip.addSelfId(chip.wordToString(args[0]))
    hub.emit(target, chip.id(), args[1])
    console.info('send', target)
    return 0
  })
  .command('get', (state, chip, args) => {
    const name = chip.wordToString(args[0])
    // do we really only need group mem, and sim mem ??
    return state[name] ?? 0
  })
  .command('set', (state, chip, args) => {
    const name = chip.wordToString(args[0])
    state[name] = args[1]
    return 0
  })
  .command('text', (state, chip, args) => {
    const [text] = chip.mapArgs(args, ARG.STRING) as [string]

    // get state
    const shared = gadgetState(GADGET_FIRMWARE.state(), chip.group())

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
  .command('hyperlink', (state, chip, args) => {
    const [target, label, input] = chip.mapArgs(
      args,
      ARG.STRING,
      ARG.STRING,
      ARG.STRING,
    ) as [string, string, string]

    // get state
    const shared = gadgetState(GADGET_FIRMWARE.state(), chip.group())

    // find slot
    const panel = findPanel(shared)

    // add hypertext
    if (shared.layoutReset) {
      shared.layoutReset = false
      panel.text = []
    }

    panel.text.push([chip.addSelfId(target), label, input])

    return 0
  })
  .command('gadget', (state, chip, args) => {
    const [edge, size, name] = chip.mapArgs(
      args,
      ARG.STRING,
      ARG.NUMBER,
      ARG.STRING,
    ) as [string, number, string]

    // get state
    const shared = gadgetState(GADGET_FIRMWARE.state(), chip.group())

    const panelName = name || edge
    const edgeConst = PANEL_TYPE_MAP[`${edge}`.toLowerCase()]

    const panelState: PANEL | undefined = shared.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      shared.layoutReset = true
      shared.layoutFocus = panelName
    } else {
      switch (edgeConst) {
        case PANEL_TYPE.START:
          initState(shared)
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
