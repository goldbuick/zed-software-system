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

const HYPERLINK_WITH_SHARED = new Set([
  'rn',
  'range',
  'sl',
  'select',
  'nm',
  'number',
  'tx',
  'text',
  'zssedit',
  'charedit',
  'coloredit',
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
  zssedit: '',
  charedit: '',
  coloredit: '',
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
  player: string,
  chip: string,
  label: string,
  words: WORD[],
  get: (name: string) => WORD,
  set: (name: string, value: WORD) => void,
) {
  // package into a panel item
  const hyperlink: WORD[] = [chip, label, ...words]
  console.info(hyperlink)

  // type of target value to track
  const type = NAME(`${hyperlink[2] as string}`)

  // do we care?
  if (HYPERLINK_WITH_SHARED.has(type)) {
    // what flag or message to change / send
    const target = `${hyperlink[3] as string}`

    // track changes to value
    // value tracking grouped by chip
    panelshared[chip] = panelshared[chip] ?? {}

    // get current value
    const current =
      get(target) ??
      HYPERLINK_WITH_SHARED_DEFAULTS[
        type as keyof typeof HYPERLINK_WITH_SHARED_DEFAULTS
      ]

    // setup tracking if needed
    if (panelshared[chip][target] === undefined) {
      const address = paneladdress(chip, target)

      // this will init the value only if not already setup
      if (isnumber(current)) {
        modemwriteinitnumber(address, current)
      }
      if (isstring(current)) {
        modemwriteinitstring(address, current)
      }

      // observe by hyperlink type
      if (HYPERLINK_WITH_SHARED_TEXT.has(type)) {
        panelshared[chip][target] = modemobservevaluestring(
          address,
          (value) => {
            if (ispresent(value) && value !== get(target)) {
              set(target, value)
            }
          },
        )
      } else {
        panelshared[chip][target] = modemobservevaluenumber(
          address,
          (value) => {
            if (ispresent(value) && value !== get(target)) {
              set(target, value)
            }
          },
        )
      }
    }
  }

  // add content
  gadgetreadqueue(player).push(hyperlink)
}
