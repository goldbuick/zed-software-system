import Case from 'case'
import {
  GADGET_STATE,
  PANEL,
  PANEL_SHARED,
  PANEL_TYPE,
  PANEL_TYPE_MAP,
} from 'zss/gadget/data/types'
import { createGuid } from 'zss/mapping/guid'
import {
  observeSharedValue,
  observeSharedType,
  MAYBE_TEXT,
  initSharedValue,
  checkSharedValue,
  MAYBE_NUMBER,
} from 'zss/network/shared'
import { STATE, WORD_VALUE, mapToString } from 'zss/system/chip'

import { createFirmware } from '../firmware'

const panelshared: Record<string, PANEL_SHARED> = {}

function initState(state: STATE): GADGET_STATE {
  state.layers = []
  state.layout = []
  state.layoutreset = true
  state.layoutfocus = 'scroll'
  return state as GADGET_STATE
}

function resetpanel(panel: PANEL) {
  // clear content
  panel.text = []

  // invoke unobserve(s)
  Object.values(panelshared[panel.id] ?? {}).forEach(
    (unobserve) => unobserve?.(),
  )
  panelshared[panel.id] = {}
}

function findpanel(state: STATE): PANEL {
  // find slot
  const panel = state.layout.find(
    (panel: PANEL) => panel.name === state.layoutfocus,
  )

  if (!panel) {
    const newPanel: PANEL = {
      id: createGuid(),
      name: state.layoutfocus,
      edge: PANEL_TYPE.RIGHT,
      size: 20,
      text: [],
    }
    state.layout.push(newPanel)
    state.layoutreset = false
    return newPanel
  }

  return panel
}

const allgadgetstate: STATE = {}

const HYPERLINK_TYPES = new Set([
  'hk',
  'hotkey',
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
])

const HYPERLINK_WITH_SHARED = new Set([
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
])

const HYPERLINK_WITH_SHARED_TEXT = new Set(['tx', 'text'])

export function gadgetstate(group: string) {
  let value: GADGET_STATE = allgadgetstate[group]

  if (value === undefined) {
    allgadgetstate[group] = value = initState({})
  }

  return value
}

export function gadgetgroups() {
  return Object.keys(allgadgetstate)
}

export function clearscroll(group: string) {
  const state = gadgetstate(group)
  state.layout = state.layout.filter((item) => item.edge !== PANEL_TYPE.SCROLL)
}

export const GADGET_FIRMWARE = createFirmware(
  () => {
    // we have no public gadget flags
    return [false, undefined]
  },
  (chip, name, value) => {
    // we watch for sets that match the shared state
    Object.values(panelshared).forEach((state) => {
      // we care about this value
      if (state[name] !== undefined) {
        checkSharedValue(chip.id(), name, value)
      }
    })

    // we observe only
    return [false, undefined]
  },
)
  .command('gadget', (chip, args) => {
    const edge = mapToString(args[0])
    const edgeConst = PANEL_TYPE_MAP[edge.toLowerCase()]
    const isScroll = edgeConst === PANEL_TYPE.SCROLL

    const arg1 = args[isScroll ? 2 : 1]
    const arg2 = args[isScroll ? 1 : 2]
    const size = chip.tpn(arg1)
    const name = mapToString(arg2)

    // get state
    const shared = gadgetstate(chip.group())
    const panelName = name || Case.capital(edge)
    const panelState: PANEL | undefined = shared.layout.find(
      (panel: PANEL) => panel.name === panelName,
    )

    if (panelState) {
      // set focus to panel and mark for reset
      shared.layoutreset = true
      shared.layoutfocus = panelName
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
          shared.layoutfocus = panelName
          break
        default:
          // todo: raise runtime error
          // probably make a chip api to do it
          break
      }
    }

    return 0
  })
  .command('text', (chip, args) => {
    const text = mapToString(args[0] ?? '')

    // get state
    const shared = gadgetstate(chip.group())

    // find slot
    const panel = findpanel(shared)

    // add text
    if (shared.layoutreset) {
      shared.layoutreset = false
      resetpanel(panel)
    }

    panel.text.push(text)
    return 0
  })
  .command('hyperlink', (chip, args) => {
    // get state
    const shared = gadgetstate(chip.group())

    // find slot
    const panel = findpanel(shared)

    // add hypertext
    if (shared.layoutreset) {
      shared.layoutreset = false
      resetpanel(panel)
    }

    // package into a panel item
    const [labelword, inputword, ...words] = args

    const label = mapToString(labelword)
    const input = mapToString(inputword)
    const linput = input.toLowerCase()

    const hyperlink: WORD_VALUE[] = [
      chip.id(),
      label,
      ...(HYPERLINK_TYPES.has(linput) ? [linput] : ['hypertext', input]),
      ...words,
    ]

    // type of target value to track
    const type = hyperlink[2] as string

    // do we care?
    if (HYPERLINK_WITH_SHARED.has(type)) {
      // track changes to flag
      const name = `${hyperlink[3] ?? ''}`

      // value tracking grouped by panel id
      panelshared[panel.id] = panelshared[panel.id] ?? {}

      // get current flag value
      const current = chip.get(name)

      // setup tracking if needed
      if (panelshared[panel.id][name] === undefined) {
        // this will init the value only if not already setup
        initSharedValue(chip.id(), name, current)

        if (HYPERLINK_WITH_SHARED_TEXT.has(type)) {
          panelshared[panel.id][name] = observeSharedType<MAYBE_TEXT>(
            chip.id(),
            name,
            (value) => {
              if (value !== undefined) {
                const str = value.toJSON()
                if (str !== chip.get(name)) {
                  chip.set(name, str)
                }
              }
            },
          )
        } else {
          panelshared[panel.id][name] = observeSharedValue<MAYBE_NUMBER>(
            chip.id(),
            name,
            (value) => {
              if (value !== undefined && value !== chip.get(name)) {
                chip.set(name, value)
              }
            },
          )
        }
      }
    }

    // add content
    panel.text.push(hyperlink)
    return 0
  })
