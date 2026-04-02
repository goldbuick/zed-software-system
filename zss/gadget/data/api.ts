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

type HYPERLINK_SHARED_BRIDGE = {
  get: (target: string) => WORD
  set: (name: string, value: WORD) => void
}

const hyperlinksharedbridges: Record<
  string,
  Record<string, HYPERLINK_SHARED_BRIDGE>
> = {}

const terminalhyperlinksharedbridges: Record<
  string,
  Record<string, HYPERLINK_SHARED_BRIDGE>
> = {}

/** Register get/set for `HYPERLINK_WITH_SHARED` links so call sites can omit closures (e.g. zip file list). */
export function registerhyperlinksharedbridge(
  chip: string,
  type: string,
  get: (target: string) => WORD,
  set: (name: string, value: WORD) => void,
): void {
  const c = NAME(chip)
  const t = NAME(type)
  hyperlinksharedbridges[c] = hyperlinksharedbridges[c] ?? {}
  hyperlinksharedbridges[c][t] = { get, set }
}

/**
 * Terminal tape bridge: same shape as `registerhyperlinksharedbridge`. Lookup merges
 * with scroll bridges — **scroll wins** when both define the same `(chip, type)`;
 * terminal registration only fills gaps.
 */
export function registerterminalhyperlinksharedbridge(
  chip: string,
  type: string,
  get: (target: string) => WORD,
  set: (name: string, value: WORD) => void,
): void {
  const c = NAME(chip)
  const t = NAME(type)
  terminalhyperlinksharedbridges[c] = terminalhyperlinksharedbridges[c] ?? {}
  terminalhyperlinksharedbridges[c][t] = { get, set }
}

export function resolvehyperlinksharedbridge(
  chip: string,
  type: string,
): HYPERLINK_SHARED_BRIDGE | undefined {
  const c = NAME(chip)
  const t = NAME(type)
  return (
    hyperlinksharedbridges[c]?.[t] ?? terminalhyperlinksharedbridges[c]?.[t]
  )
}

/**
 * Tape hyperlinks that bind shared modem state should use a prefix of the form
 * `chip:target` where `target` does not contain `:`. Matches `paneladdress(chip, target)`.
 */
export function parseterminalmodemprefix(
  prefix: string,
): { chip: string; target: string } | undefined {
  const idx = prefix.indexOf(':')
  if (idx <= 0) {
    return undefined
  }
  if (prefix.includes(':', idx + 1)) {
    return undefined
  }
  const chip = prefix.slice(0, idx).trim()
  const target = prefix.slice(idx + 1).trim()
  if (!chip.length || !target.length) {
    return undefined
  }
  return { chip: NAME(chip), target }
}

type READ_CONTEXT_SNAPSHOT = {
  board: typeof READ_CONTEXT.board
  element: typeof READ_CONTEXT.element
  elementfocus: typeof READ_CONTEXT.elementfocus
}

export function applyhyperlinksharedmodemsync(
  chip: string,
  type: string,
  target: string,
  getforchip: (name: string) => WORD,
  setforchip: (name: string, value: WORD) => void,
  readcontextcache: READ_CONTEXT_SNAPSHOT,
): void {
  const typ = NAME(type) as keyof typeof HYPERLINK_WITH_SHARED_DEFAULTS
  if (!HYPERLINK_WITH_SHARED.has(typ)) {
    return
  }

  function setvalue<T extends number | string>(targ: string, value: T) {
    if (ispresent(value) && value !== getforchip(targ)) {
      READ_CONTEXT.board = readcontextcache.board
      READ_CONTEXT.element = readcontextcache.element
      READ_CONTEXT.elementfocus = readcontextcache.elementfocus
      setforchip(targ, value)
    }
  }

  panelshared[chip] = panelshared[chip] ?? {}
  const current = getforchip(target) ?? HYPERLINK_WITH_SHARED_DEFAULTS[typ]

  if (panelshared[chip][target] !== undefined) {
    return
  }

  const address = paneladdress(chip, target)
  if (HYPERLINK_WITH_SHARED_TEXT.has(typ)) {
    if (isstring(current)) {
      modemwriteinitstring(address, current)
    }
    panelshared[chip][target] = modemobservevaluestring(address, (value) => {
      setvalue<string>(target, value)
    })
  } else {
    if (isnumber(current)) {
      modemwriteinitnumber(address, current)
    }
    panelshared[chip][target] = modemobservevaluenumber(address, (value) => {
      setvalue<number>(target, value)
    })
  }
}

export function initstate(): GADGET_STATE {
  return {
    id: createsid(),
    board: '',
    boardname: '',
    layers: [],
    scroll: [],
    sidebar: [],
    exiteast: '',
    exitwest: '',
    exitnorth: '',
    exitsouth: '',
    exitne: '',
    exitnw: '',
    exitse: '',
    exitsw: '',
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
  bgedit: 0,
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

const SCROLL_COLOR_EDGE = '$dkpurple'
const SCROLL_CHR_TM = '$196'
const SCROLL_CHR_BM = '$205'

export function gadgettbar(player: string, width: number) {
  gadgettext(player, `${SCROLL_COLOR_EDGE}${SCROLL_CHR_TM.repeat(width)}`)
}

export function gadgetbbar(player: string, width: number) {
  gadgettext(player, `${SCROLL_COLOR_EDGE}${SCROLL_CHR_BM.repeat(width)}`)
}

export function gadgetheader(player: string, header: string) {
  gadgettext(player, `${SCROLL_COLOR_EDGE} ${' '.repeat(header.length)} `)
  gadgettbar(player, header.length + 2)
  gadgettext(player, `${SCROLL_COLOR_EDGE} $white${header} `)
  gadgetbbar(player, header.length + 2)
}

export function gadgetsection(player: string, section: string) {
  gadgettext(player, `${SCROLL_COLOR_EDGE} ${' '.repeat(section.length)} `)
  gadgettext(player, `${SCROLL_COLOR_EDGE} $gray${section} `)
  gadgetbbar(player, section.length + 2)
}

export function gadgetoption(player: string, option: string, label: string) {
  gadgettext(player, `${SCROLL_COLOR_EDGE} $white${option} $blue${label}`)
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

  const bridge = resolvehyperlinksharedbridge(chip, type)
  const getforchip = bridge?.get ?? get
  const setforchip = bridge?.set ?? set

  const cache: READ_CONTEXT_SNAPSHOT = {
    board: READ_CONTEXT.board,
    element: READ_CONTEXT.element,
    elementfocus: READ_CONTEXT.elementfocus,
  }

  if (HYPERLINK_WITH_SHARED.has(type)) {
    const target = `${hyperlink[2] as string}`
    applyhyperlinksharedmodemsync(
      chip,
      type,
      target,
      getforchip,
      setforchip,
      cache,
    )
  }

  // add content
  gadgetreadqueue(player).push(hyperlink)
}
