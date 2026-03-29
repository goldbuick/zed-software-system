import { get as idbget, update as idbupdate } from 'idb-keyval'
import { DIVIDER } from 'zss/feature/writeui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ptstoarea, pttoindex } from 'zss/mapping/2d'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memoryreadelement, memoryreadterrain } from './boardaccess'
import { memoryboardelementisobject } from './boardelement'
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

  registerhyperlinksharedbridge(
    'batch',
    'select',
    (target) => {
      const key = target as keyof STYLE_CONFIG
      if (key === 'stylechars' || key === 'stylecolors' || key === 'stylebgs') {
        return styleconfig[key]
      }
      return 0
    },
    (name, value) => {
      if (isnumber(value) || isstring(value)) {
        const key = name as keyof STYLE_CONFIG
        if (
          key === 'stylechars' ||
          key === 'stylecolors' ||
          key === 'stylebgs'
        ) {
          // @ts-expect-error bah
          styleconfig[key] = value
        }
      }
    },
  )

  const lines = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    `apply visuals from the terrain`,
    `stored in the paste buffer`,
    `!stylechars select no 0 yes 1;style chars?`,
    `!stylecolors select no 0 yes 1;style colors?`,
    `!stylebgs select no 0 yes 1;style bgs?`,
    DIVIDER,
    `!styleall:${area} hk 1 " 1 " next;style terrain & objects`,
    `!styleobjects:${area} hk 2 " 2 " next;style objects`,
    `!styleterrain:${area} hk 3 " 3 " next;style terrain`,
  ]
  scrollwritelines(player, 'style', lines.join('\n'), 'batch')
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
