import { get as idbget, update as idbupdate } from 'idb-keyval'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { pttoindex, ptwithin } from 'zss/mapping/2d'
import { MAYBE, deepcopy, ispresent } from 'zss/mapping/types'
import { CATEGORY, PT } from 'zss/words/types'

import {
  boardelementread,
  boardgetterrain,
  boardobjectcreate,
  boardsafedelete,
  boardsetterrain,
} from './board'
import { bookelementdisplayread } from './book'
import { BOARD, BOARD_ELEMENT } from './types'

import {
  MEMORY_LABEL,
  memoryensuresoftwarebook,
  memoryreadplayerboard,
} from '.'

function ptstoarea(p1: PT, p2: PT) {
  return `${p1.x},${p1.y},${p2.x},${p2.y}`
}

// COPY & PASTE buffers

type BOARD_ELEMENT_BUFFER = {
  board: string
  width: number
  height: number
  terrain: MAYBE<BOARD_ELEMENT>[]
  objects: BOARD_ELEMENT[]
}

// read / write from indexdb

async function readsecretheap(): Promise<BOARD_ELEMENT_BUFFER | undefined> {
  return idbget('secretheap')
}

async function writesecretheap(
  updater: (oldValue: BOARD_ELEMENT_BUFFER | undefined) => BOARD_ELEMENT_BUFFER,
): Promise<void> {
  return idbupdate('secretheap', updater)
}

export async function hassecretheap() {
  return !!(await readsecretheap())
}

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

  // corner coords on copy
  for (let y = y1; y <= y2; ++y) {
    for (let x = x1; x <= x2; ++x) {
      const pt = { x: x - x1, y: y - y1 }
      const maybeobject = boardelementread(board, { x, y })
      if (maybeobject?.category === CATEGORY.ISOBJECT) {
        terrain.push(deepcopy(boardgetterrain(board, x, y)))
        if (bookelementdisplayread(maybeobject).name !== 'player') {
          objects.push({
            ...deepcopy(maybeobject),
            ...pt,
            id: 'blank',
          })
        }
      } else {
        // maybe terrain
        terrain.push({
          ...deepcopy(maybeobject),
          ...pt,
        })
      }
    }
  }

  return {
    board: board.id,
    width,
    height,
    terrain,
    objects,
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
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            boardsafedelete(board, maybeobject, mainbook.timestamp)
          }
          boardsetterrain(board, { x, y })
        }
      }
      break
    }
    case 'cutobjects': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          const maybeobject = boardelementread(board, { x, y })
          if (maybeobject?.category === CATEGORY.ISOBJECT) {
            boardsafedelete(board, maybeobject, mainbook.timestamp)
          }
        }
      }
      break
    }
    case 'cutterrain': {
      for (let y = p1.y; y <= p2.y; ++y) {
        for (let x = p1.x; x <= p2.x; ++x) {
          boardsetterrain(board, { x, y })
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
  const secretheap = await readsecretheap()
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
          boardsetterrain(board, {
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
          boardobjectcreate(board, {
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
          boardobjectcreate(board, {
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
          boardsetterrain(board, {
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
          boardsetterrain(board, {
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
