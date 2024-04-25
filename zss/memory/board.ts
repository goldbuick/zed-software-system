import { WORD_VALUE } from 'zss/chip'
import {
  PT,
  DIR,
  STR_DIR,
  dirfrompts,
  ispt,
  CATEGORY,
  STR_COLOR,
  COLOR,
  isstrcolor,
  readstrcolor,
  readstrbg,
} from 'zss/firmware/wordtypes'
import { pick } from 'zss/mapping/array'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, MAYBE_STRING, ispresent, noop } from 'zss/mapping/types'

import { listnamedelements, picknearestpt } from './atomics'

// simple built-ins go here
export type BOARD_ELEMENT_STATS = {
  cycle?: number
  stepx?: number
  stepy?: number
  player?: string
  sender?: string
  inputmove?: string[]
  inputalt?: number
  inputctrl?: number
  inputshift?: number
  inputok?: number
  inputcancel?: number
  inputmenu?: number
  data?: any
  [key: string]: WORD_VALUE
}

export type BOARD_ELEMENT = {
  // this element is an instance of an element type
  kind?: string
  // objects only
  id?: string
  x?: number
  y?: number
  lx?: number
  ly?: number
  code?: string
  // this is a unique name for this instance
  name?: string
  // display
  char?: number
  color?: number
  bg?: number
  // interaction
  pushable?: number
  collision?: number
  destructible?: number
  // custom
  stats?: BOARD_ELEMENT_STATS
  // runtime
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
  kindcode?: string
  removed?: number
}

export type MAYBE_BOARD_ELEMENT = MAYBE<BOARD_ELEMENT>

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD_STATS = Record<string, WORD_VALUE>

export type BOARD = {
  // lookup
  id?: string
  // dimensions
  x: number
  y: number
  width: number
  height: number
  // specifics
  terrain: MAYBE_BOARD_ELEMENT[]
  objects: Record<string, BOARD_ELEMENT>
  // custom
  stats?: BOARD_STATS
  // runtime only
  lookup?: MAYBE_STRING[]
  named?: Record<string, Set<string | number>>
}

export type MAYBE_BOARD = MAYBE<BOARD>

const BOARD_WIDTH = 60
const BOARD_HEIGHT = 25
const BOARD_TERRAIN: undefined[] = new Array(BOARD_WIDTH * BOARD_HEIGHT)

export function createboard(fn = noop<BOARD>) {
  const board: BOARD = {
    id: createguid(),
    x: 0,
    y: 0,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    terrain: BOARD_TERRAIN.slice(0),
    objects: {},
  }
  return fn(board)
}

export function boardelementname(element: MAYBE_BOARD_ELEMENT) {
  return (element?.name ?? element?.kinddata?.name ?? 'object').toLowerCase()
}

export function boardelementcolor(element: MAYBE_BOARD_ELEMENT) {
  return element?.color ?? element?.kinddata?.color ?? COLOR.BLACK
}

export function boardelementbg(element: MAYBE_BOARD_ELEMENT) {
  return element?.bg ?? element?.kinddata?.bg ?? COLOR.BLACK
}

export function boardelementapplycolor(
  element: MAYBE_BOARD_ELEMENT,
  strcolor: STR_COLOR | undefined,
) {
  if (!ispresent(element) || !isstrcolor(strcolor)) {
    return
  }
  const color = readstrcolor(strcolor)
  if (ispresent(color)) {
    element.color = color
  }
  const bg = readstrbg(strcolor)
  if (ispresent(bg)) {
    element.bg = bg
  }
}

export function boardgetterrain(
  board: MAYBE_BOARD,
  x: number,
  y: number,
): MAYBE_BOARD_ELEMENT {
  return (x >= 0 && x < (board?.width ?? -1)) ??
    (y >= 0 && y < (board?.height ?? -1))
    ? board?.terrain[x + y * board.width]
    : undefined
}

export function boardsetterrain(
  board: MAYBE_BOARD,
  from: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (
    !ispresent(board) ||
    !ispresent(from) ||
    !ispresent(from.x) ||
    !ispresent(from.y) ||
    from.x < 0 ||
    from.x >= board.width ||
    from.y < 0 ||
    from.y >= board.height
  ) {
    return undefined
  }
  board.terrain[from.x + from.y * board.width] = from
  return from
}

export function boardcreateobject(
  board: MAYBE_BOARD,
  from: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(board) || !ispresent(from)) {
    return undefined
  }

  const object = {
    ...from,
    id: from.id ?? createguid(),
  }

  // add to board
  board.objects[object.id] = object

  // return object
  return object
}

export function boardterrainsetfromkind(
  board: MAYBE_BOARD,
  x: number,
  y: number,
  kind: string,
): MAYBE_BOARD_ELEMENT {
  return boardsetterrain(board, { x, y, kind })
}

export function boardobjectcreatefromkind(
  board: MAYBE_BOARD,
  x: number,
  y: number,
  kind: string,
): MAYBE_BOARD_ELEMENT {
  return boardcreateobject(board, { x, y, kind })
}

export function boardreadobject(
  board: MAYBE_BOARD,
  id: string,
): MAYBE_BOARD_ELEMENT {
  if (!board) {
    return undefined
  }
  return board.objects[id]
}

function moveptbydir(
  pt: PT,
  dir: DIR.NORTH | DIR.SOUTH | DIR.WEST | DIR.EAST | undefined,
): PT {
  switch (dir) {
    case DIR.NORTH:
      --pt.y
      break
    case DIR.SOUTH:
      ++pt.y
      break
    case DIR.WEST:
      --pt.x
      break
    case DIR.EAST:
      ++pt.x
      break
    default:
      // no-op
      break
  }
  return pt
}

export function boardevaldir(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dir: STR_DIR,
): PT {
  const tx = target?.x ?? 0
  const ty = target?.y ?? 0
  const pt: PT = { x: tx, y: ty }
  const start: PT = { ...pt }
  const flow = dirfrompts(
    {
      x: target?.lx ?? pt.x,
      y: target?.ly ?? pt.y,
    },
    pt,
  )

  // we need to know current flow etc..

  for (let i = 0; i < dir.length && pt.x === tx && pt.y === ty; ++i) {
    const dirconst = DIR[dir[i]]
    switch (dirconst) {
      case DIR.IDLE:
        // no-op
        break
      case DIR.NORTH:
      case DIR.SOUTH:
      case DIR.WEST:
      case DIR.EAST:
        moveptbydir(pt, dirconst)
        break
      case DIR.BY:
        // BY <x> <y>
        break
      case DIR.AT:
        // AT <x> <y>
        break
      case DIR.FLOW:
        moveptbydir(pt, flow)
        break
      case DIR.SEEK: {
        const player = boardfindplayer(board, target)
        if (ispt(player)) {
          moveptbydir(pt, dirfrompts(start, player))
        }
        break
      }
      case DIR.RNDNS:
        moveptbydir(pt, pick(DIR.NORTH, DIR.SOUTH))
        break
      case DIR.RNDNE:
        moveptbydir(pt, pick(DIR.NORTH, DIR.EAST))
        break
      case DIR.RND:
        moveptbydir(pt, pick(DIR.NORTH, DIR.SOUTH, DIR.WEST, DIR.EAST))
        break
      // modifiers
      case DIR.CW: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        moveptbydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.CCW: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        moveptbydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.OPP: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        moveptbydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.RNDP: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        switch (dirfrompts(start, modpt)) {
          case DIR.NORTH:
          case DIR.SOUTH:
            pt.x += pick(-1, 1)
            break
          case DIR.WEST:
          case DIR.EAST:
            pt.y += pick(-1, 1)
            break
        }
        break
      }
    }
  }

  return pt
}

export function boarddeleteobject(board: MAYBE_BOARD, id: string) {
  if (ispresent(board?.objects[id])) {
    delete board.objects[id]
    return true
  }
  return false
}

export function boardfindplayer(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(board) || !ispresent(target)) {
    return undefined
  }

  // check aggro
  const aggro = target.stats?.player ?? ''
  const player = board.objects[aggro]
  if (ispresent(player)) {
    return player
  }

  // check pt
  if (!ispt(target)) {
    return undefined
  }

  // nearest player to target
  return picknearestpt(target, listnamedelements(board, 'player'))
}
