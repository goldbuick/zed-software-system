import Case from 'case'
import { deepClone } from 'fast-json-patch'
import { LAYER, PANEL, PANEL_TYPE, PANEL_TYPE_MAP } from 'zss/gadget/data/types'
import { createGuid } from 'zss/mapping/guid'
import { hub } from 'zss/network/hub'
import { ARG, STATE, WORD_VALUE } from 'zss/system/chip'

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

const allgadgetstate: STATE = {}

const HYPERLINK_TYPES = ['hotkey', 'range', 'select', 'number', 'text']

export function gadgetstate(group: string) {
  let value: GADGET_STATE = allgadgetstate[group]

  if (value === undefined) {
    allgadgetstate[group] = value = initState({})
  }

  return value
}

export function clearscroll(group: string) {
  const state = gadgetstate(group)
  state.layout = state.layout.filter((item) => item.edge !== PANEL_TYPE.SCROLL)
}

export const GADGET_FIRMWARE = createFirmware(
  (chip, name) => {
    return [false, undefined]
  },
  (chip, name, value) => {
    return [false, undefined]
  },
)
  .command('parse', (chip, args) => {
    // this is to handle gadget specific consts and wording
    const [value] = args
    return [chip.evalToNumber(value), 1]
  })
  .command('if', (chip, args) => {
    console.info('if', args)
    return 0
  })
  .command('stat', (chip, args) => {
    const parts = args.map((arg) => chip.evalToString(arg))
    chip.setName(parts.join(' '))
    return 0
  })
  .command('end', (chip) => {
    chip.endofprogram()
    return 0
  })
  .command('send', (chip, args) => {
    const target = chip.addSelfId(chip.evalToString(args[0]))
    hub.emit(target, chip.id(), args[1])
    console.info('send', target)
    return 0
  })
  .command('text', (chip, args) => {
    const [text] = chip.evalArgs(args, ARG.STRING) as [string]

    // get state
    const shared = gadgetstate(chip.group())

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
  .command('hyperlink', (chip, args) => {
    // get state
    const shared = gadgetstate(chip.group())

    // find slot
    const panel = findPanel(shared)

    // add hypertext
    if (shared.layoutReset) {
      shared.layoutReset = false
      panel.text = []
    }

    // package into a panel item
    const [labelword, inputword, ...words] = args

    const label = chip.evalToString(labelword)
    const input = chip.evalToString(inputword)
    const linput = input.toLowerCase()

    const hyperlink: WORD_VALUE[] = [
      chip.id(),
      label,
      ...(HYPERLINK_TYPES.indexOf(linput) === -1
        ? ['hypertext', input]
        : [linput]),
      ...words.map(chip.evalToAny),
    ]

    panel.text.push(hyperlink)

    return 0
  })
  .command('gadget', (chip, args) => {
    const edge = chip.evalToString(args[0])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    const isScroll = edgeConst === PANEL_TYPE.SCROLL

    const size = chip.evalToNumber(args[isScroll ? 2 : 1])
    const name = chip.evalToString(args[isScroll ? 1 : 2])

    // get state
    const shared = gadgetstate(chip.group())
    const panelName = name || Case.capital(edge)
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
