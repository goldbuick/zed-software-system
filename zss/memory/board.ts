import {
  PT,
  DIR,
  STR_DIR,
  dirfrompts,
  ispt,
  CATEGORY,
  STR_COLOR,
  isstrcolor,
  readstrcolor,
  readstrbg,
  ptapplydir,
  COLLISION,
  mapstrdirtoconst,
  WORD,
} from 'zss/firmware/wordtypes'
import { COLOR } from 'zss/gadget/data/types'
import { pick } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import {
  MAYBE,
  MAYBE_STRING,
  isnumber,
  ispresent,
  noop,
} from 'zss/mapping/types'

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
  [key: string]: WORD
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
  collision?: COLLISION
  destructible?: number
  // custom
  stats?: BOARD_ELEMENT_STATS
  // runtime
  category?: CATEGORY
  kinddata?: BOARD_ELEMENT
  kindcode?: string
  headless?: boolean
  removed?: number
}

export type MAYBE_BOARD_ELEMENT = MAYBE<BOARD_ELEMENT>

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD_STATS = Record<string, WORD>

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

export function boardcreate(fn = noop<BOARD>) {
  const board: BOARD = {
    id: createsid(),
    x: 0,
    y: 0,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    terrain: BOARD_TERRAIN.slice(0),
    objects: {},
  }
  return fn(board)
}

export function boardelementindex(board: MAYBE_BOARD, pt: PT): number {
  if (
    !ispresent(board) ||
    pt.x < 0 ||
    pt.x >= board.width ||
    pt.y < 0 ||
    pt.y >= board.height
  ) {
    return -1
  }
  return pt.x + pt.y * board.width
}

export function boardelementread(
  board: MAYBE_BOARD,
  pt: PT,
): MAYBE_BOARD_ELEMENT {
  // clipping
  const index = boardelementindex(board, pt)
  if (index < 0 || !ispresent(board?.lookup)) {
    return undefined
  }

  // check lookup
  const object = boardobjectread(board, board.lookup[index] ?? '')
  if (ispresent(object)) {
    return object
  }

  // return terrain
  return board.terrain[index]
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

  const terrain = { ...from }
  const index = from.x + from.y * board.width
  board.terrain[index] = terrain

  return from
}

export function boardobjectcreate(
  board: MAYBE_BOARD,
  from: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(board) || !ispresent(from)) {
    return undefined
  }

  const object = {
    ...from,
    id: from.id ?? createsid(),
  }

  // add to board
  board.objects[object.id] = object

  // return object
  return object
}

export function boardterrainsetfromkind(
  board: MAYBE_BOARD,
  pt: PT,
  kind: string,
): MAYBE_BOARD_ELEMENT {
  return boardsetterrain(board, { ...pt, kind })
}

export function boardobjectcreatefromkind(
  board: MAYBE_BOARD,
  pt: PT,
  kind: string,
): MAYBE_BOARD_ELEMENT {
  return boardobjectcreate(board, { ...pt, kind })
}

export function boardobjectread(
  board: MAYBE_BOARD,
  id: string,
): MAYBE_BOARD_ELEMENT {
  if (!board) {
    return undefined
  }
  return board.objects[id]
}

export function boardevaldir(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dir: STR_DIR,
): PT {
  if (!ispresent(board) || !ispresent(target)) {
    return { x: 0, y: 0 }
  }

  const pt: PT = {
    x: target.x ?? 0,
    y: target.y ?? 0,
  }
  const lpt: PT = {
    x: target.lx ?? pt.x,
    y: target.ly ?? pt.y,
  }

  // we need to know current flow etc..
  const start: PT = { ...pt }
  const flow = dirfrompts(lpt, pt)
  const xmax = board.width - 1
  const ymax = board.height - 1
  for (let i = 0; i < dir.length; ++i) {
    const dirconst = mapstrdirtoconst(dir[i])
    switch (dirconst) {
      case DIR.IDLE:
        // no-op
        break
      case DIR.NORTH:
      case DIR.SOUTH:
      case DIR.WEST:
      case DIR.EAST:
        ptapplydir(pt, dirconst)
        break
      case DIR.BY: {
        // BY <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = clamp(pt.x + x, 0, xmax)
          pt.y = clamp(pt.y + y, 0, ymax)
        }
        // need to skip x & y
        i += 2
        break
      }
      case DIR.AT: {
        // BY <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = clamp(x, 0, xmax)
          pt.y = clamp(y, 0, ymax)
        }
        // need to skip x & y
        i += 2
        break
      }
      case DIR.FLOW:
        ptapplydir(pt, flow)
        break
      case DIR.SEEK: {
        const player = boardfindplayer(board, target)
        if (ispt(player)) {
          ptapplydir(pt, dirfrompts(start, player))
        }
        break
      }
      case DIR.RNDNS:
        ptapplydir(pt, pick(DIR.NORTH, DIR.SOUTH))
        break
      case DIR.RNDNE:
        ptapplydir(pt, pick(DIR.NORTH, DIR.EAST))
        break
      case DIR.RND:
        ptapplydir(pt, pick(DIR.NORTH, DIR.SOUTH, DIR.WEST, DIR.EAST))
        break
      // modifiers
      case DIR.CW: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        ptapplydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.CCW: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        ptapplydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.OPP: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        ptapplydir(pt, dirfrompts(start, modpt))
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

function boardelementexport(element: MAYBE_BOARD_ELEMENT): MAYBE_BOARD_ELEMENT {
  if (!ispresent(element)) {
    return undefined
  }

  const elementexport: BOARD_ELEMENT = {
    ...element,
  }

  // cut runtime data
  delete elementexport.category
  delete elementexport.kinddata
  delete elementexport.kindcode
  delete elementexport.headless
  delete elementexport.removed

  return elementexport
}

export function boardexport(board: MAYBE_BOARD): MAYBE_BOARD {
  if (!ispresent(board)) {
    return undefined
  }

  // trim terrain
  const terrain = board.terrain.map(boardelementexport)

  // trim objects, and remove any players
  const objects: Record<string, BOARD_ELEMENT> = {}
  Object.keys(board.objects).forEach((id) => {
    const object = boardelementexport(board.objects[id])
    if (ispresent(object) && object.kind !== 'player') {
      objects[id] = object
    }
  })

  return {
    ...board,
    terrain,
    objects,
  }
}
