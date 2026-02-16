import { get as idbget, update as idbupdate } from 'idb-keyval'
import { parsetarget } from 'zss/device'
import { apitoast, registercopy, vmcli } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { ptstoarea, pttoindex, ptwithin } from 'zss/mapping/2d'
import { doasync } from 'zss/mapping/func'
import { waitfor } from 'zss/mapping/tick'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { CATEGORY, COLOR, PT } from 'zss/words/types'

import {
  memorycreateboardobject,
  memoryreadelement,
  memoryreadterrain,
  memorysafedeleteelement,
  memorywriteterrain,
} from './boardoperations'
import { memoryreadelementdisplay } from './bookoperations'
import {
  memoryinspectbgarea,
  memoryinspectchararea,
  memoryinspectcolorarea,
  memoryinspectempty,
  memoryinspectemptymenu,
} from './inspection'
import { memoryinspectstyle, memoryinspectstylemenu } from './inspectionstyle'
import { memoryreadplayerboard } from './playermanagement'
import { BOARD, BOARD_ELEMENT, MEMORY_LABEL } from './types'

import { memoryensuresoftwarebook } from '.'

// COPY & PASTE buffers

type BOARD_ELEMENT_BUFFER = {
  board: string
  width: number
  height: number
  terrain: MAYBE<BOARD_ELEMENT>[]
  objects: BOARD_ELEMENT[]
  flattened: MAYBE<BOARD_ELEMENT>[]
}

// read / write from indexdb

function createboardelementbuffer(
  board: BOARD,
  p1: PT,
  p2: PT,
): BOARD_ELEMENT_BUFFER {
  const x1 = Math.min(p1.x, p2.x)
  const y1 = Math.min(p1.y, p2.y)
  const x2 = Math.max(p1.x, p2.x)
  const y2 = Math.max(p1.y, p2.y)
  const width = x2 - x1 + 1
  const height = y2 - y1 + 1
  const terrain: MAYBE<BOARD_ELEMENT>[] = []
  const objects: BOARD_ELEMENT[] = []
  const flattened: MAYBE<BOARD_ELEMENT>[] = []

  // corner coords on copy
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const pt = { x: x - x1, y: y - y1 }
      const maybeobject = memoryreadelement(board, { x, y })
      if (maybeobject?.kind === 'player') {
        // skip player
        const under = deepcopy(memoryreadterrain(board, x, y))
        terrain.push(under)
        // visible element only
        flattened.push(under)
      } else {
        if (maybeobject?.category === CATEGORY.ISOBJECT) {
          // terrain and object
          terrain.push(deepcopy(memoryreadterrain(board, x, y)))
          objects.push({
            ...deepcopy(maybeobject),
            ...pt,
            id: 'blank',
          })
        } else {
          // only terrain
          terrain.push({
            ...deepcopy(maybeobject),
            ...pt,
          })
        }
        // visible element only
        flattened.push(deepcopy(maybeobject))
      }
    }
  }

  return {
    board: board.id,
    width,
    height,
    terrain,
    objects,
    flattened,
  }
}

async function writesecretheap(
  updater: (oldValue: BOARD_ELEMENT_BUFFER | undefined) => BOARD_ELEMENT_BUFFER,
): Promise<void> {
  return idbupdate('secretheap', updater)
}

export async function memoryhassecretheap() {
  return !!(await memoryreadsecretheap())
}

export async function memoryinspectbatchcommand(path: string, player: string) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }
  const batch = parsetarget(path)
  const [x1, y1, x2, y2] = batch.path.split(',').map((v) => parseFloat(v))
  const p1: PT = { x: Math.min(x1, x2), y: Math.min(y1, y2) }
  const p2: PT = { x: Math.max(x1, x2), y: Math.max(y1, y2) }
  switch (batch.target) {
    case 'copy':
      memoryinspectcopymenu(player, p1, p2)
      break
    case 'copyall':
    case 'copyobjects':
    case 'copyterrain':
      await memoryinspectcopy(player, p1, p2, batch.target)
      break
    case 'copyastext': {
      const p1x = Math.min(p1.x, p2.x)
      const p1y = Math.min(p1.y, p2.y)
      const p2x = Math.max(p1.x, p2.x)
      const p2y = Math.max(p1.y, p2.y)
      let content = ''
      for (let y = p1y; y <= p2y; ++y) {
        let color = COLOR.ONCLEAR
        let bg = COLOR.ONCLEAR
        content += ''
        for (let x = p1x; x <= p2x; ++x) {
          const element = memoryreadterrain(board, x, y)
          const display = memoryreadelementdisplay(element, 0, 0, 0)
          if (display.color != color) {
            color = display.color
            content += `$${COLOR[display.color]}`.toLowerCase()
          }
          if (display.bg != bg) {
            bg = display.bg
            content += `$ON${COLOR[display.bg]}`.toLowerCase()
          }
          content += `$${display.char}`
        }
        content += '\n'
      }
      registercopy(SOFTWARE, player, content)
      apitoast(SOFTWARE, player, `copied! chars ${p1x},${p1y} to ${p2x},${p2y}`)
      break
    }
    case 'cut':
      memoryinspectcutmenu(player, p1, p2)
      break
    case 'cutall':
    case 'cutobjects':
    case 'cutterrain':
      await memoryinspectcut(player, p1, p2, batch.target)
      break
    case 'paste':
      memoryinspectpastemenu(player, p1, p2)
      break
    case 'pasteall':
    case 'pasteobjects':
    case 'pasteterrain':
    case 'pasteterraintiled':
      await memoryinspectpaste(player, p1, p2, batch.target)
      break
    case 'style':
      await memoryinspectstylemenu(player, p1, p2)
      break
    case 'styleall':
    case 'styleobjects':
    case 'styleterrain':
      await memoryinspectstyle(player, p1, p2, batch.target)
      break
    case 'empty':
      memoryinspectemptymenu(player, p1, p2)
      break
    case 'emptyall':
    case 'emptyobjects':
    case 'emptyterrain':
      memoryinspectempty(player, p1, p2, batch.target)
      break
    case 'chars':
      memoryinspectchararea(player, p1, p2, 'char')
      break
    case 'colors':
      memoryinspectcolorarea(player, p1, p2, 'color')
      break
    case 'bgs':
      memoryinspectbgarea(player, p1, p2, 'bg')
      break
    case 'copycoords':
      registercopy(SOFTWARE, player, [x1, y1, x2, y2].join(' '))
      break
    case 'pageopen':
      doasync(SOFTWARE, player, async () => {
        // wait a little
        await waitfor(800)
        // open codepage
        vmcli(SOFTWARE, player, `#pageopen ${batch.path}`)
      })
      break
    default:
      console.info('unknown batch', batch)
      break
  }
}

export async function memoryinspectcopy(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const secretheap = createboardelementbuffer(board, p1, p2)
  switch (mode) {
    case 'copyobjects':
      secretheap.terrain = []
      break
    case 'copyterrain':
      secretheap.objects = []
      break
  }

  await writesecretheap(() => secretheap)
}

export function memoryinspectcopymenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  gadgethyperlink(player, 'batch', 'copy terrain & objects', [
    `copyall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'copy objects', [
    `copyobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'copy terrain', [
    `copyterrain:${area}`,
    'hk',
    '3',
  ])
  gadgethyperlink(player, 'batch', 'copy as text', [
    `copyastext:${area}`,
    'hk',
    '4',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'copy'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryinspectcut(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  const mainbook = memoryensuresoftwarebook(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }

  const board = memoryreadplayerboard(player)
  if (!ispresent(board)) {
    return
  }

  const secretheap = createboardelementbuffer(board, p1, p2)
  switch (mode) {
    case 'cutobjects':
      secretheap.terrain = []
      break
    case 'cutterrain':
      secretheap.objects = []
      break
  }

  switch (mode) {
    case 'cutall': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryreadelement(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            memorysafedeleteelement(board, maybeobject, mainbook.timestamp)
          }
          memorywriteterrain(board, { x, y })
        }
      }
      break
    }
    case 'cutobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = memoryreadelement(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            memorysafedeleteelement(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'cutterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          memorywriteterrain(board, { x, y })
        }
      }
      break
    }
  }

  await writesecretheap(() => secretheap)
}

export function memoryinspectcutmenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)

  gadgethyperlink(player, 'batch', 'cut terrain & objects', [
    `cutall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'cut objects', [
    `cutobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'cut terrain', [
    `cutterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'cut'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryinspectpaste(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
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

  switch (mode) {
    case 'pasteall': {
      for (let y = 0; y < iheight; ++y) {
        for (let x = 0; x < iwidth; ++x) {
          const idx = pttoindex({ x, y }, secretheap.width)
          memorywriteterrain(board, {
            ...secretheap.terrain[idx],
            x: x1 + x,
            y: y1 + y,
          })
        }
      }
      for (let i = 0; i < secretheap.objects.length; ++i) {
        const obj = secretheap.objects[i]
        if (
          ispresent(obj.x) &&
          ispresent(obj.y) &&
          ptwithin(obj.x, obj.y, 0, width - 1, height - 1, 0)
        ) {
          memorycreateboardobject(board, {
            ...obj,
            id: undefined,
            x: x1 + obj.x,
            y: y1 + obj.y,
          })
        }
      }
      break
    }
    case 'pasteobjects':
      for (let i = 0; i < secretheap.objects.length; ++i) {
        const obj = secretheap.objects[i]
        if (
          ispresent(obj.x) &&
          ispresent(obj.y) &&
          ptwithin(obj.x, obj.y, 0, width - 1, height - 1, 0)
        ) {
          memorycreateboardobject(board, {
            ...obj,
            id: undefined,
            x: x1 + obj.x,
            y: y1 + obj.y,
          })
        }
      }
      break
    case 'pasteterrain':
      for (let y = 0; y < iheight; ++y) {
        for (let x = 0; x < iwidth; ++x) {
          const idx = pttoindex({ x, y }, secretheap.width)
          memorywriteterrain(board, {
            ...secretheap.terrain[idx],
            x: x1 + x,
            y: y1 + y,
          })
        }
      }
      break
    case 'pasteterraintiled':
      for (let y = y1; y <= y2; ++y) {
        for (let x = x1; x <= x2; ++x) {
          const tx = (x - x1) % secretheap.width
          const ty = (y - y1) % secretheap.height
          const idx = pttoindex({ x: tx, y: ty }, secretheap.width)
          memorywriteterrain(board, {
            ...secretheap.terrain[idx],
            x,
            y,
          })
        }
      }
      break
  }
}

export function memoryinspectpastemenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'batch', 'paste terrain & objects', [
    `pasteall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'paste objects', [
    `pasteobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'paste terrain', [
    `pasteterrain:${area}`,
    'hk',
    '3',
  ])
  gadgethyperlink(player, 'batch', 'paste terrain tiled', [
    `pasteterraintiled:${area}`,
    'hk',
    '4',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'paste'
  shared.scroll = gadgetcheckqueue(player)
}

export async function memoryreadsecretheap(): Promise<
  BOARD_ELEMENT_BUFFER | undefined
> {
  return idbget('secretheap')
}
