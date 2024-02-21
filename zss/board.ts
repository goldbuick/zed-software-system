import { isDefined } from 'ts-extras'
import { ref } from 'valtio'

import { BOOK, readaddress } from './book'
import { WORD_VALUE } from './chip'
import { CONTENT_TYPE } from './codepage'
import { MAYBE_STRING } from './device/shared'
import { PT, DIR, STR_DIR, dirfrompts } from './firmware/wordtypes'
import { range, select } from './mapping/array'
import { createguid } from './mapping/guid'
import { memoryreadchip } from './memory'
import { OS } from './os'

// generics
export type BOARD_ELEMENT_STATS = {
  cycle?: number
  player?: string
  sender?: string
  inputmove?: string[]
  inputshoot?: string[]
  inputok?: number
  inputcancel?: number
  inputmenu?: number
  data?: any
  [key: string]: WORD_VALUE
}

export type BOARD_ELEMENT = Partial<{
  // objects get id & position
  id: string
  x: number
  y: number
  lx: number
  ly: number
  // this element has a code associated with it
  code: string
  // this element is an instance of an element type
  kind: string
  kinddata: BOARD_ELEMENT
  // this is a unique name for this instance
  name: string
  // display
  char: number
  color: number
  bg: number
  // interaction
  pushable: number
  collision: number
  // custom
  stats: BOARD_ELEMENT_STATS
}>

export type MAYBE_BOARD_ELEMENT = BOARD_ELEMENT | undefined

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
}

export function createboard(
  width: number,
  height: number,
  fn?: (board: BOARD) => BOARD,
) {
  const board: BOARD = {
    id: createguid(),
    x: 0,
    y: 0,
    width,
    height,
    terrain: range(width * height - 1).map(() => undefined),
    objects: {},
  }
  return fn ? fn(board) : board
}

export function createboardobject(
  board: BOARD,
  from: BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  const object = {
    ...from,
    id: from.id ?? createguid(),
  }

  // add to board
  board.objects[object.id] = object

  // return object
  return object
}

export function boardreadobject(board: BOARD, id: string): MAYBE_BOARD_ELEMENT {
  return board.objects[id]
}

function moveptbydir(
  pt: PT,
  dir: DIR.NORTH | DIR.SOUTH | DIR.WEST | DIR.EAST | undefined,
): PT {
  switch (dir) {
    case DIR.NORTH:
      --pt[1]
      break
    case DIR.SOUTH:
      ++pt[1]
      break
    case DIR.WEST:
      --pt[0]
      break
    case DIR.EAST:
      ++pt[0]
      break
    default:
      // no-op
      break
  }
  return pt
}

export function boardevaldir(
  board: BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dir: STR_DIR,
): PT {
  const tx = target?.x ?? 0
  const ty = target?.y ?? 0
  const pt: PT = [tx, ty]
  const start: PT = [...pt]
  const flow = dirfrompts([target?.lx ?? pt[0], target?.ly ?? pt[1]], pt)

  // we need to know current flow etc..

  for (let i = 0; i < dir.length && pt[0] === tx && pt[1] === ty; ++i) {
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
        // skip pt, pt
        break
      case DIR.AT:
        // skip pt, pt
        break
      case DIR.FLOW:
        moveptbydir(pt, flow)
        break
      case DIR.SEEK: {
        const player = boardfindplayer(board, target)
        // skip
        break
      }
      case DIR.RNDNS:
        moveptbydir(pt, select(DIR.NORTH, DIR.SOUTH))
        break
      case DIR.RNDNE:
        moveptbydir(pt, select(DIR.NORTH, DIR.EAST))
        break
      case DIR.RND:
        moveptbydir(pt, select(DIR.NORTH, DIR.SOUTH, DIR.WEST, DIR.EAST))
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
            pt[0] += select(-1, 1)
            break
          case DIR.WEST:
          case DIR.EAST:
            pt[1] += select(-1, 1)
            break
        }
        break
      }
    }
  }

  return pt
}

export function boarddeleteobject(board: BOARD, id: string) {
  if (board.objects[id]) {
    delete board.objects[id]
    return true
  }
  return false
}

export function boardmoveobject(
  board: BOARD,
  target: MAYBE_BOARD_ELEMENT,
  dir: STR_DIR,
) {
  const object = boardreadobject(board, target?.id ?? '')
  if (!object || !board.lookup) {
    return false
  }

  const [dx, dy] = boardevaldir(board, object, dir)

  // first pass clipping
  if (dx < 0 || dx >= board.width || dy < 0 || dy >= board.height) {
    return false
  }

  const idx = dx + dy * board.width

  // blocked by an object
  const maybeobject = board.lookup[idx]
  if (isDefined(maybeobject)) {
    return false
  }

  // todo - everything else ...
  board.lookup[idx] = undefined

  // update object location
  object.x = dx
  object.y = dy

  // update lookup
  board.lookup[object.x + object.y * board.width] = object.id ?? ''

  return true
}

export function boardfindplayer(board: BOARD, target: MAYBE_BOARD_ELEMENT) {
  //
}

export function bookobjectreadkind(
  book: BOOK,
  object: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isDefined(object) && isDefined(object.kind)) {
    if (!isDefined(object.kinddata)) {
      object.kinddata = readaddress(book, CONTENT_TYPE.OBJECT, object.kind)
    }
    return object.kinddata
  }
  return undefined
}

function boardsetlookup(board: BOARD) {
  const lookup: string[] = new Array(board.width * board.height).fill(undefined)
  const objects = Object.values(board.objects)

  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (isDefined(object.x) && isDefined(object.y) && isDefined(object.id)) {
      lookup[object.x + object.y * board.width] = object.id
    }
  }

  board.lookup = ref(lookup)
}

export function boardtick(os: OS, book: BOOK, board: BOARD) {
  // build object lookup pre-tick
  boardsetlookup(board)

  // iterate through objects
  const targets = Object.values(board.objects)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]

    // check that we have an id
    if (!isDefined(target.id)) {
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

    // chip check
    if (!os.has(target.id)) {
      os.boot(target.id, code)
    }

    // set context
    const context = memoryreadchip(target.id)
    context.activeinput = undefined
    context.board = board
    context.target = target

    // run chip
    os.tick(target.id)
  }

  // cleanup objects flagged for deletion
}
