import Case from 'case'
import { CHIP, STATE } from 'zss/chip'
import {
  modemobservevaluenumber,
  modemobservevaluestring,
  modemwriteinitnumber,
  modemwriteinitstring,
  modemwritevaluenumber,
  modemwritevaluestring,
} from 'zss/device/modem'
import { createsid } from 'zss/mapping/guid'
import {
  MAYBE_NUMBER,
  MAYBE_STRING,
  ispresent,
  isnumber,
  isstring,
} from 'zss/mapping/types'
import { WORD } from 'zss/memory/types'

import {
  GADGET_STATE,
  PANEL,
  PANEL_ITEM,
  PANEL_SHARED,
  PANEL_TYPE,
  PANEL_TYPE_SIZES,
  paneladdress,
} from './types'

const panelshared: Record<string, PANEL_SHARED> = {}

export function initstate(state: STATE, player: string): GADGET_STATE {
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
      id: createsid(),
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

type GADGET_STATE_PROVIDER = (player: string) => GADGET_STATE

const tempgadgetstate: Record<string, GADGET_STATE> = {}
let GADGET_PROVIDER = (player: string) => {
  let value = tempgadgetstate[player]
  if (!ispresent(value)) {
    value = initstate({}, player)
    tempgadgetstate[player] = value
  }
  return value
}

export function gadgetstateprovider(provider: GADGET_STATE_PROVIDER) {
  GADGET_PROVIDER = provider
}

export function gadgetstate(player: string) {
  return GADGET_PROVIDER(player)
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
      const address = paneladdress(chip.id(), name)
      if (isnumber(value)) {
        modemwritevaluenumber(address, value)
      }
      if (isstring(value)) {
        modemwritevaluestring(address, value)
      }
    }
  })
}

export function gadgetcheckscroll(player: string) {
  // get state
  let ticker = ''
  const shared = gadgetstate(player)

  shared.layout = shared.layout.filter((item) => {
    if (item.edge === PANEL_TYPE.SCROLL) {
      const [line] = item.text
      // catch single lines of text and turn into ticker messages
      if (isstring(line) && item.text.length === 1) {
        ticker = line
      }
      return item.text.length > 1
    }
    return true
  })

  return ticker
}

export function gadgetpanel(
  player: string,
  edge: string,
  edgeConst: PANEL_TYPE,
  maybesize: MAYBE_NUMBER,
  maybename: MAYBE_STRING,
) {
  // get state
  const shared = gadgetstate(player)
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
        initstate(shared, player)
        break
      case PANEL_TYPE.LEFT:
      case PANEL_TYPE.RIGHT:
      case PANEL_TYPE.TOP:
      case PANEL_TYPE.BOTTOM:
      case PANEL_TYPE.SCROLL: {
        const panel: PANEL = {
          id: createsid(),
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

export function gadgettext(player: string, text: string) {
  // get state
  const shared = gadgetstate(player)

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
  player: string,
  chip: CHIP,
  label: string,
  input: string,
  words: WORD[],
) {
  // get state
  const shared = gadgetstate(player)

  // find slot
  const panel = findpanel(shared)

  // add hyperlink
  if (shared.layoutreset) {
    shared.layoutreset = false
    resetpanel(panel)
  }

  // package into a panel item
  const linput = input.toLowerCase()

  const hyperlink: WORD[] = [
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
    const current =
      chip.get(name) ??
      HYPERLINK_WITH_SHARED_DEFAULTS[
        type as keyof typeof HYPERLINK_WITH_SHARED_DEFAULTS
      ]

    // setup tracking if needed
    if (panelshared[panel.id][name] === undefined) {
      const address = paneladdress(chip.id(), name)
      // this will init the value only if not already setup
      if (isnumber(current)) {
        modemwriteinitnumber(address, current)
      }
      if (isstring(current)) {
        modemwriteinitstring(address, current)
      }
      // observe by hyperlink type
      if (HYPERLINK_WITH_SHARED_TEXT.has(type)) {
        panelshared[panel.id][name] = modemobservevaluestring(
          address,
          (value) => {
            if (ispresent(value) && value !== chip.get(name)) {
              console.info(
                'modemobservevaluestring??',
                name,
                value,
                chip.get(name),
              )
              chip.set(name, value)
            }
          },
        )
      } else {
        panelshared[panel.id][name] = modemobservevaluenumber(
          address,
          (value) => {
            if (ispresent(value) && value !== chip.get(name)) {
              console.info(
                'modemobservevaluenumber??',
                name,
                value,
                chip.get(name),
              )
              chip.set(name, value)
            }
          },
        )
      }
    }
  }

  // add content
  panel.text.push(hyperlink as PANEL_ITEM)
}
