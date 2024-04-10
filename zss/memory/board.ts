import { ref } from 'valtio'
import { WORD_VALUE } from 'zss/chip'
import {
  PT,
  DIR,
  STR_DIR,
  dirfrompts,
  COLLISION,
  ispt,
  CATEGORY,
} from 'zss/firmware/wordtypes'
import { pick } from 'zss/mapping/array'
import { createguid } from 'zss/mapping/guid'
import { MAYBE, MAYBE_STRING, isdefined, noop } from 'zss/mapping/types'

import { namedelements, nearestpt } from './atomics'
import {
  BOOK,
  MAYBE_BOOK,
  bookobjectreadkind,
  bookterrainreadkind,
} from './book'

// generics
export type BOARD_ELEMENT_STATS = {
  cycle?: number
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

export type BOARD_ELEMENT = Partial<{
  // this element is an instance of an element type
  kind: string
  // objects only
  id: string
  x: number
  y: number
  lx: number
  ly: number
  walk: number
  code: string
  // this is a unique name for this instance
  name: string
  // display
  char: number
  color: number
  bg: number
  // interaction
  pushable: number
  collision: number
  destructible: number
  // custom
  stats: BOARD_ELEMENT_STATS
  // runtime
  category: CATEGORY
  kinddata: BOARD_ELEMENT
  kindcode: string
  removed: number
}>

export type MAYBE_BOARD_ELEMENT = MAYBE<BOARD_ELEMENT>

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD_STATS = {
  [key: string]: WORD_VALUE
}

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

export function createboardobject(
  board: MAYBE_BOARD,
  from: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!isdefined(board) || !isdefined(from)) {
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

export type BOARD_DIR = {
  x: number
  y: number
  frame?: string
}

export function boardevaldir(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dir: STR_DIR,
): BOARD_DIR {
  const tx = target?.x ?? 0
  const ty = target?.y ?? 0
  const pt: BOARD_DIR = { x: tx, y: ty }
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
      // framing
      case DIR.EDIT: {
        pt.frame = 'edit'
        break
      }
    }
  }

  return pt
}

export function boarddeleteobject(board: MAYBE_BOARD, id: string) {
  if (isdefined(board) && isdefined(board.objects[id])) {
    delete board.objects[id]
    return true
  }
  return false
}

export function boardcheckcollision(source: COLLISION, dest: COLLISION) {
  switch (source) {
    case COLLISION.WALK:
      return dest !== COLLISION.WALK
    case COLLISION.SWIM:
      return dest !== COLLISION.SWIM
    case COLLISION.SOLID:
      return true // solid runs into everything
    case COLLISION.BULLET:
      return dest !== COLLISION.WALK && dest !== COLLISION.SWIM
  }
}

export function boardmoveobject(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dest: PT,
) {
  const object = boardreadobject(board, target?.id ?? '')
  if (
    !isdefined(book) ||
    !isdefined(board) ||
    !isdefined(object) ||
    !isdefined(board.lookup)
  ) {
    return false
  }

  // first pass clipping
  if (
    dest.x < 0 ||
    dest.x >= board.width ||
    dest.y < 0 ||
    dest.y >= board.height
  ) {
    return false
  }

  const idx = dest.x + dest.y * board.width
  const targetkind = bookobjectreadkind(book, object)
  const targetcollision =
    object.collision ?? targetkind?.collision ?? COLLISION.WALK

  // blocked by an object
  const maybeobject = board.lookup[idx]
  if (isdefined(maybeobject)) {
    // touch & thud
    return false
  }

  // blocked by terrain
  const mayberterrain = board.terrain[idx]
  if (isdefined(mayberterrain)) {
    const terrainkind = bookterrainreadkind(book, mayberterrain)
    const terraincollision =
      mayberterrain.collision ?? terrainkind?.collision ?? COLLISION.WALK
    if (boardcheckcollision(targetcollision, terraincollision)) {
      // touch & thud
      return false
    }
  }

  // todo - everything else ...
  board.lookup[idx] = undefined

  // update object location
  object.x = dest.x
  object.y = dest.y

  // update lookup
  board.lookup[object.x + object.y * board.width] = object.id ?? ''

  return true
}

export function boardfindplayer(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!isdefined(board) || !isdefined(target)) {
    return undefined
  }

  // check aggro
  const aggro = target.stats?.player ?? ''
  const player = board.objects[aggro]
  if (isdefined(player)) {
    return player
  }

  // check pt
  if (!ispt(target)) {
    return undefined
  }

  // nearest player to target
  return nearestpt(board, target, namedelements(board, 'player'))
}

function boardsetlookup(book: BOOK, board: BOARD) {
  const lookup: string[] = new Array(board.width * board.height).fill(undefined)
  const named: Record<string, Set<string | number>> = {}

  // add objects to lookup & to named
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (isdefined(object.x) && isdefined(object.y) && isdefined(object.id)) {
      // cache kind
      const kind = bookobjectreadkind(book, object)

      // add category
      object.category = CATEGORY.OBJECT

      // update lookup
      lookup[object.x + object.y * board.width] = object.id

      // update named lookup
      const name = (object.name ?? kind?.name ?? 'object').toLowerCase()
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(object.id)
    }
  }

  // add terrain to named
  let x = 0
  let y = 0
  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (isdefined(terrain)) {
      // cache kind
      const kind = bookobjectreadkind(book, terrain)

      // add coords
      terrain.x = x
      terrain.y = y
      terrain.category = CATEGORY.TERRAIN

      // update named lookup
      const name = (terrain.name ?? kind?.name ?? 'terrain').toLowerCase()
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(i)
    }
    ++x
    if (x >= board.width) {
      x = 0
      ++y
    }
  }

  board.lookup = ref(lookup)
  board.named = ref(named)
}

export function boardtick(
  book: MAYBE_BOOK,
  board: MAYBE_BOARD,
  oncode: (
    book: BOOK,
    board: BOARD,
    target: BOARD_ELEMENT,
    id: string,
    code: string,
  ) => void,
) {
  if (!isdefined(book) || !isdefined(board)) {
    return
  }

  // build object lookup pre-tick
  boardsetlookup(book, board)

  // iterate through objects
  const targets = Object.values(board.objects)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]

    // check that we have an id
    if (!isdefined(target.id)) {
      return
    }

    // track last position
    target.lx = target.x
    target.ly = target.y

    // lookup kind
    const kind = bookobjectreadkind(book, target)

    // object code
    const code = target.code ?? kind?.code ?? ''

    // check that we have code to execute
    if (!code) {
      return
    }

    // signal id & code
    oncode(book, board, target, target.id, code)
  }

  // cleanup objects flagged for deletion
}
