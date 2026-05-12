import { DIVIDER, zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { ptstoarea, pttoindex } from 'zss/mapping/2d'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import { PT } from 'zss/words/types'

import { memoryreadelement, memoryreadterrain } from './boardaccess'
import { memoryboardelementisobject } from './boardelement'
import { memoryreadelementdisplay } from './bookoperations'
import { memoryreadsecretheap } from './inspectionbatch'
import { createinspectionconfig } from './inspectionconfig'
import { memoryreadplayerboard } from './playermanagement'

type STYLE_CONFIG = {
  stylechars: number
  stylecolors: number
  stylebgs: number
}

const styleconfig = createinspectionconfig<STYLE_CONFIG>('styleconfig', {
  stylechars: 1,
  stylecolors: 1,
  stylebgs: 1,
})

export async function memoryinspectstyle(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  await styleconfig.save()
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
  const cfg = styleconfig.read()

  for (let y = 0; y < iheight; ++y) {
    for (let x = 0; x < iwidth; ++x) {
      const idx = pttoindex({ x, y }, secretheap.width)
      const maybeelement = secretheap.flattened[idx]
      const display = memoryreadelementdisplay(maybeelement)
      const pt = { x: x1 + x, y: y1 + y }
      if (mode === 'styleall' || mode === 'styleobjects') {
        const element = memoryreadelement(board, pt)
        if (ispresent(element) && memoryboardelementisobject(element)) {
          if (cfg.stylechars) {
            element.char = display.char
          }
          if (cfg.stylecolors) {
            element.color = display.color
          }
          if (cfg.stylebgs) {
            element.bg = display.bg
          }
        }
      }
      if (mode === 'styleall' || mode === 'styleterrain') {
        const element = memoryreadterrain(board, pt.x, pt.y)
        if (ispresent(element)) {
          if (cfg.stylechars) {
            element.char = display.char
          }
          if (cfg.stylecolors) {
            element.color = display.color
          }
          if (cfg.stylebgs) {
            element.bg = display.bg
          }
        }
      }
    }
  }
}

registerhyperlinksharedbridge(
  'batch',
  'select',
  (_typ, target) => {
    const key = target as keyof STYLE_CONFIG
    if (key === 'stylechars' || key === 'stylecolors' || key === 'stylebgs') {
      return styleconfig.read()[key]
    }
    return 0
  },
  (_typ, name, value) => {
    if (isnumber(value) || isstring(value)) {
      const key = name as keyof STYLE_CONFIG
      if (key === 'stylechars' || key === 'stylecolors' || key === 'stylebgs') {
        styleconfig.write({ ...styleconfig.read(), [key]: Number(value) })
      }
    }
  },
)

export async function memoryinspectstylemenu(player: string, p1: PT, p2: PT) {
  await styleconfig.load()

  const area = ptstoarea(p1, p2)

  const lines = [
    `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`,
    `apply visuals from the terrain`,
    `stored in the paste buffer`,
    zsszedlinkline('stylechars select no 0 yes 1', 'style chars?'),
    zsszedlinkline('stylecolors select no 0 yes 1', 'style colors?'),
    zsszedlinkline('stylebgs select no 0 yes 1', 'style bgs?'),
    DIVIDER,
    zsszedlinkline(
      `styleall:${area} hk 1 " 1 " next`,
      'style terrain & objects',
    ),
    zsszedlinkline(`styleobjects:${area} hk 2 " 2 " next`, 'style objects'),
    zsszedlinkline(`styleterrain:${area} hk 3 " 3 " next`, 'style terrain'),
  ]
  scrollwritelines(player, 'style', zsstexttape(lines), 'batch')
}
