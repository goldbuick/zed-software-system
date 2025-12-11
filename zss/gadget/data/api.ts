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
import { MAYBE, isnumber, ispresent, isstring, noop } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { READ_CONTEXT } from 'zss/words/reader'
import { hascenter } from 'zss/words/textformat'
import { NAME, WORD } from 'zss/words/types'

import { GADGET_STATE, PANEL_ITEM, PANEL_SHARED, paneladdress } from './types'

const panelqueue: Record<string, PANEL_ITEM[]> = {}
const panelshared: Record<string, PANEL_SHARED> = {}

export function initstate(): GADGET_STATE {
  return {
    id: createsid(),
    board: '',
    layers: [],
    scroll: [],
    sidebar: [],
    exiteast: '',
    exitwest: '',
    exitnorth: '',
    exitsouth: '',
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
  'bgedit',
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
  shared.scrollname = ''
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

export function gadgetaddcenterpadding(queue: PANEL_ITEM[]) {
  const items: PANEL_ITEM[] = []

  let lasthadcenter: MAYBE<boolean>
  for (let i = 0; i < queue.length; ++i) {
    const item = queue[i]
    const itemhascenter = isstring(item) && ispresent(hascenter(item))
    if (ispresent(lasthadcenter) && lasthadcenter !== itemhascenter) {
      items.push(' ')
    }
    items.push(item)
    lasthadcenter = itemhascenter
  }

  return items
}

export function gadgettext(element: string, text: string) {
  gadgetreadqueue(element).push(text)
}

export function gadgethyperlink(
  player: string,
  chip: string,
  label: string,
  words: WORD[],
  get: (name: string) => WORD = () => 0,
  set: (name: string, value: WORD) => void = noop,
) {
  // pad target-less hyperlinks
  const targetcheck = NAME(maptostring(words[0]))
  switch (targetcheck) {
    case 'copyit':
    case 'openit':
    case 'viewit':
    case 'runit':
      words.unshift('istargetless')
      break
  }

  // package into a panel item
  const hyperlink: WORD[] = [chip, label, ...words]
  // chip, label, target, [type], [...args]

  // type of target value to track
  const type = NAME(
    `${hyperlink[3] as string}`,
  ) as keyof typeof HYPERLINK_WITH_SHARED_DEFAULTS

  // cache READ_CONTEXT
  const cache = { ...READ_CONTEXT }

  // set value handler
  function setvalue<T extends number | string>(target: string, value: T) {
    if (ispresent(value) && value !== get(target)) {
      READ_CONTEXT.board = cache.board
      READ_CONTEXT.element = cache.element
      READ_CONTEXT.elementfocus = cache.elementfocus
      set(target, value)
    }
  }

  // do we care?
  if (HYPERLINK_WITH_SHARED.has(type)) {
    // what flag or message to change / send
    const target = `${hyperlink[2] as string}`

    // track changes to value by chip
    panelshared[chip] = panelshared[chip] ?? {}

    // get current value
    const current = get(target) ?? HYPERLINK_WITH_SHARED_DEFAULTS[type]

    // setup tracking if needed
    if (panelshared[chip][target] === undefined) {
      const address = paneladdress(chip, target)
      // observe by hyperlink type
      if (HYPERLINK_WITH_SHARED_TEXT.has(type)) {
        // this will init the value only if not already setup
        if (isstring(current)) {
          modemwriteinitstring(address, current)
        }
        panelshared[chip][target] = modemobservevaluestring(
          address,
          (value) => {
            setvalue<string>(target, value)
          },
        )
      } else {
        // this will init the value only if not already setup
        if (isnumber(current)) {
          modemwriteinitnumber(address, current)
        }
        panelshared[chip][target] = modemobservevaluenumber(
          address,
          (value) => {
            setvalue<number>(target, value)
          },
        )
      }
    }
  }

  // add content
  gadgetreadqueue(player).push(hyperlink)
}
