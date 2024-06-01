import Case from 'case'
import { CHIP, STATE } from 'zss/chip'
import {
  MAYBE_SHARED_TEXT,
  observesharedtype,
  observesharedvalue,
  servesharedvalue,
  updatesharedvalue,
} from 'zss/device/shared'
import { WORD, WORD_VALUE } from 'zss/firmware/wordtypes'
import { createguid } from 'zss/mapping/guid'
import {
  MAYBE_NUMBER,
  MAYBE_STRING,
  ispresent,
  isnumber,
} from 'zss/mapping/types'

import {
  GADGET_STATE,
  PANEL,
  PANEL_SHARED,
  PANEL_TYPE,
  PANEL_TYPE_SIZES,
} from './types'

const panelshared: Record<string, PANEL_SHARED> = {}

function initstate(state: STATE, player: string): GADGET_STATE {
  state.player = player
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
  Object.values(panelshared[panel.id] ?? {}).forEach((unobserve) =>
    unobserve?.(),
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

const HYPERLINK_WITH_SHARED_DEFAULTS = {
  rn: 1,
  range: 1,
  sl: 0,
  select: 0,
  nm: 0,
  number: 0,
  tx: '',
  text: '',
}

export function gadgetstate(player: string) {
  let value: GADGET_STATE = allgadgetstate[player]
  return ispresent(value)
    ? value
    : (allgadgetstate[player] = value = initstate({}, player))
}

export function gadgetplayers() {
  return Object.keys(allgadgetstate)
}

export function gadgetclearscroll(player: string) {
  const shared = gadgetstate(player)
  shared.layout = shared.layout.filter(
    (item) => item.edge !== PANEL_TYPE.SCROLL,
  )
}

export function gadgetcheckset(chip: CHIP, name: string, value: WORD) {
  // we watch for sets that match the shared state
  Object.values(panelshared).forEach((state) => {
    // we care about this value
    if (state[name] !== undefined) {
      updatesharedvalue(chip.id(), name, value)
    }
  })
}

export function gadgetcheckscroll(chip: CHIP) {
  // get state
  const shared = gadgetstate(chip.id())
  shared.layout = shared.layout.filter(
    (item) => item.edge !== PANEL_TYPE.SCROLL || item.text.length > 0,
  )
}

export function gadgetpanel(
  chip: CHIP,
  edge: string,
  edgeConst: PANEL_TYPE,
  maybesize: MAYBE_NUMBER,
  maybename: MAYBE_STRING,
) {
  // get state
  const shared = gadgetstate(chip.id())
  const size = maybesize
  const name = maybename ?? Case.capital(edge)

  const panelState: PANEL | undefined = shared.layout.find(
    (panel: PANEL) => panel.name === name,
  )

  if (panelState) {
    // set focus to panel and mark for reset
    shared.layoutreset = true
    shared.layoutfocus = name
    // you can also resize panels
    if (isnumber(size)) {
      panelState.size = size
    }
  } else {
    switch (edgeConst) {
      case PANEL_TYPE.START:
        initstate(shared, chip.id())
        break
      case PANEL_TYPE.LEFT:
      case PANEL_TYPE.RIGHT:
      case PANEL_TYPE.TOP:
      case PANEL_TYPE.BOTTOM:
      case PANEL_TYPE.SCROLL: {
        const panel: PANEL = {
          id: createguid(),
          name: name,
          edge: edgeConst,
          size: size ?? PANEL_TYPE_SIZES[edgeConst],
          text: [],
        }
        shared.layout.push(panel)
        shared.layoutfocus = name
        break
      }
      default:
        // todo: raise runtime error
        // probably make a chip api to do it
        break
    }
  }
}

export function gadgettext(chip: CHIP, text: string) {
  // get state
  const shared = gadgetstate(chip.id())

  // find slot
  const panel = findpanel(shared)

  // add text
  if (shared.layoutreset) {
    shared.layoutreset = false
    resetpanel(panel)
  }

  panel.text.push(text)
}

export function gadgethyperlink(
  chip: CHIP,
  label: string,
  input: string,
  words: WORD[],
) {
  // get state
  const shared = gadgetstate(chip.id())

  // find slot
  const panel = findpanel(shared)

  // add hyperlink
  if (shared.layoutreset) {
    shared.layoutreset = false
    resetpanel(panel)
  }

  // package into a panel item
  const linput = input.toLowerCase()

  const hyperlink: WORD_VALUE[] = [
    chip.id(),
    label,
    ...(HYPERLINK_TYPES.has(linput) ? [linput] : ['hyperlink', input]),
    ...words,
  ]

  // type of target value to track
  const type = hyperlink[2] as string

  // do we care?
  if (HYPERLINK_WITH_SHARED.has(type)) {
    // track changes to flag
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const name = `${hyperlink[3] ?? ''}`

    // value tracking grouped by panel id
    panelshared[panel.id] = panelshared[panel.id] ?? {}

    // get current flag value
    const current = chip.get(name)

    // setup tracking if needed
    if (panelshared[panel.id][name] === undefined) {
      // this will init the value only if not already setup
      // and mark this guid as origin
      servesharedvalue(
        chip.id(),
        name,
        current ??
          HYPERLINK_WITH_SHARED_DEFAULTS[
            type as keyof typeof HYPERLINK_WITH_SHARED_DEFAULTS
          ],
      )

      if (HYPERLINK_WITH_SHARED_TEXT.has(type)) {
        panelshared[panel.id][name] = observesharedtype<MAYBE_SHARED_TEXT>(
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
        panelshared[panel.id][name] = observesharedvalue<MAYBE_NUMBER>(
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
}
