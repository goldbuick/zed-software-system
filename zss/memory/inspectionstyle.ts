import { get as idbget, update as idbupdate } from 'idb-keyval'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ptstoarea, pttoindex } from 'zss/mapping/2d'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT, WORD } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import { memoryreadelement, memoryreadterrain } from './boardoperations'
import { memoryreadelementdisplay } from './bookoperations'
import { memoryreadsecretheap } from './inspectionbatch'
import { memoryreadplayerboard } from './playermanagement'

type STYLE_CONFIG = {
  stylechars: number
  stylecolors: number
  stylebgs: number
}

let styleconfig: STYLE_CONFIG = {
  stylechars: 1,
  stylecolors: 1,
  stylebgs: 1,
}

export async function memoryinspectstyle(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  await memorywritestyleconfig(() => styleconfig)
  const board = memoryreadplayerboard(player)
  const secretheap = await memoryreadsecretheap()
  if (!ispresent(board) || !ispresent(secretheap)) {
    return
  }

  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const width = x2 - x1 + 1
  const height = y2 - y1 + 1
  const iwidth = Math.min(secretheap.width, width)
  const iheight = Math.min(secretheap.height, height)

  for (let y = 0; y < iheight; ++y) {
    for (let x = 0; x < iwidth; ++x) {
      const idx = pttoindex({ x, y }, secretheap.width)
      const maybeelement = secretheap.flattened[idx]
      const display = memoryreadelementdisplay(maybeelement)
      const pt = { x: x1 + x, y: y1 + y }
      if (mode === 'styleall' || mode === 'styleobjects') {
        const element = memoryreadelement(board, pt)
        if (ispresent(element) && memoryboardelementisobject(element)) {
          if (styleconfig.stylechars) {
            element.char = display.char
          }
          if (styleconfig.stylecolors) {
            element.color = display.color
          }
          if (styleconfig.stylebgs) {
            element.bg = display.bg
          }
        }
      }
      if (mode === 'styleall' || mode === 'styleterrain') {
        const element = memoryreadterrain(board, pt.x, pt.y)
        if (ispresent(element)) {
          if (styleconfig.stylechars) {
            element.char = display.char
          }
          if (styleconfig.stylecolors) {
            element.color = display.color
          }
          if (styleconfig.stylebgs) {
            element.bg = display.bg
          }
        }
      }
    }
  }
}

export async function memoryinspectstylemenu(player: string, p1: PT, p2: PT) {
  const config = await memoryreadstyleconfig()
  styleconfig = {
    ...styleconfig,
    ...config,
  }

  const area = ptstoarea(p1, p2)

  function get(name: string) {
    return styleconfig[name as keyof STYLE_CONFIG]
  }
  function set(name: string, value: WORD) {
    if (isnumber(value) || isstring(value)) {
      // @ts-expect-error bah
      styleconfig[name as keyof STYLE_CONFIG] = value
    }
  }

  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, `apply visuals from the terrain`)
  gadgettext(player, `stored in the paste buffer`)
  gadgethyperlink(
    player,
    'batch',
    'style chars?',
    [`stylechars`, 'select', 'no', '0', 'yes', '1'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'batch',
    'style colors?',
    [`stylecolors`, 'select', 'no', '0', 'yes', '1'],
    get,
    set,
  )
  gadgethyperlink(
    player,
    'batch',
    'style bgs?',
    [`stylebgs`, 'select', 'no', '0', 'yes', '1'],
    get,
    set,
  )
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'style terrain & objects', [
    `styleall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'style objects', [
    `styleobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'style terrain', [
    `styleterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'style'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryreadstyleconfig(): Promise<
  STYLE_CONFIG | undefined
> {
  return idbget('styleconfig')
}

export async function memorywritestyleconfig(
  updater: (oldValue: STYLE_CONFIG | undefined) => STYLE_CONFIG,
): Promise<void> {
  return idbupdate('styleconfig', updater)
}
