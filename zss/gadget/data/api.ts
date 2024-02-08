import { STATE } from 'zss/chip'
import { createguid } from 'zss/mapping/guid'

import { GADGET_STATE, PANEL, PANEL_SHARED, PANEL_TYPE } from './types'

const panelshared: Record<string, PANEL_SHARED> = {}

export function initstate(state: STATE, player: string): GADGET_STATE {
  state.player = player
  state.layers = []
  state.layout = []
  state.layoutreset = true
  state.layoutfocus = 'scroll'
  return state as GADGET_STATE
}

export function resetpanel(panel: PANEL) {
  // clear content
  panel.text = []

  // invoke unobserve(s)
  Object.values(panelshared[panel.id] ?? {}).forEach(
    (unobserve) => unobserve?.(),
  )
  panelshared[panel.id] = {}
}

export function findpanel(state: STATE): PANEL {
  // find slot
  const panel = state.layout.find(
    (panel: PANEL) => panel.name === state.layoutfocus,
  )

  if (!panel) {
    const newPanel: PANEL = {
      id: createguid(),
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

export const HYPERLINK_TYPES = new Set([
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

export const HYPERLINK_WITH_SHARED = new Set([
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
])

export const HYPERLINK_WITH_SHARED_TEXT = new Set(['tx', 'text'])

export function gadgetstate(player: string) {
  let value: GADGET_STATE = allgadgetstate[player]

  if (value === undefined) {
    allgadgetstate[player] = value = initstate({}, player)
  }

  return value
}

export function gadgetplayers() {
  return Object.keys(allgadgetstate)
}

export function clearscroll(player: string) {
  const state = gadgetstate(player)
  state.layout = state.layout.filter((item) => item.edge !== PANEL_TYPE.SCROLL)
}
