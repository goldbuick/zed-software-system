import { CHIP } from 'zss/chip'
import {
  modemobservevaluenumber,
  modemobservevaluestring,
  modemwriteinitnumber,
  modemwriteinitstring,
  modemwritevaluenumber,
  modemwritevaluestring,
} from 'zss/device/modem'
import { createsid } from 'zss/mapping/guid'
import { ispresent, isnumber, isstring } from 'zss/mapping/types'
import { NAME, WORD } from 'zss/words/types'

import { GADGET_STATE, PANEL_ITEM, PANEL_SHARED, paneladdress } from './types'

const panelqueue: Record<string, PANEL_ITEM[]> = {}
const panelshared: Record<string, PANEL_SHARED> = {}

export function initstate(): GADGET_STATE {
  return {
    id: createsid(),
    layers: [],
    scroll: [],
    sidebar: [],
  }
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
    tempgadgetstate[player] = value = initstate()
  }
  return value
}

export function gadgetstateprovider(provider: GADGET_STATE_PROVIDER) {
  GADGET_PROVIDER = provider
}

export function gadgetstate(element: string) {
  return GADGET_PROVIDER(element)
}

function gadgetreadqueue(element: string) {
  if (!ispresent(panelqueue[element])) {
    panelqueue[element] = []
  }
  return panelqueue[element]
}

export function gadgetclearscroll(element: string) {
  const shared = gadgetstate(element)
  shared.scroll = []
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

export function gadgetcheckqueue(element: string) {
  const queue = gadgetreadqueue(element)
  panelqueue[element] = []
  return queue
}

export function gadgettext(element: string, text: string) {
  gadgetreadqueue(element).push(text)
}

export function gadgethyperlink(
  element: string,
  chip: CHIP,
  label: string,
  input: string,
  words: WORD[],
) {
  const shared = gadgetstate(element)

  // package into a panel item
  const linput = NAME(input)

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
    // panelshared[panel.id] = panelshared[panel.id] ?? {}
    // get current flag value
    const current =
      chip.get(name) ??
      HYPERLINK_WITH_SHARED_DEFAULTS[
        type as keyof typeof HYPERLINK_WITH_SHARED_DEFAULTS
      ]
    // setup tracking if needed
    if (panelshared[shared.id][name] === undefined) {
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
        panelshared[shared.id][name] = modemobservevaluestring(
          address,
          (value) => {
            if (ispresent(value) && value !== chip.get(name)) {
              chip.set(name, value)
            }
          },
        )
      } else {
        panelshared[shared.id][name] = modemobservevaluenumber(
          address,
          (value) => {
            if (ispresent(value) && value !== chip.get(name)) {
              chip.set(name, value)
            }
          },
        )
      }
    }
  }

  // add content
  gadgetreadqueue(element).push(hyperlink)
}
