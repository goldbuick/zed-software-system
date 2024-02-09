import { isDefined } from 'ts-extras'
import { ref } from 'valtio'

import { BOOK, readaddress } from './book'
import { WORD_VALUE } from './chip'
import { CONTENT_TYPE } from './codepage'
import { MAYBE_STRING } from './device/shared'
import { range } from './mapping/array'
import { createguid } from './mapping/guid'
import { memoryreadchip } from './memory'
import { OS } from './os'

// generics
export type BOARD_ELEMENT_STATS = {
  cycle?: number
  player?: string
  sender?: string
  inputmove?: number
  inputshoot?: number
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
  // this element has a code associated with it
  code: string
  // this element is an instance of an element type
  kind: string
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

export function boarddeleteobject(board: BOARD, id: string) {
  if (board.objects[id]) {
    delete board.objects[id]
    return true
  }
  return false
}

function boardsetlookup(board: BOARD) {
  const lookup: string[] = new Array(board.width * board.height).fill(undefined)

  Object.values(board.objects).forEach((object) => {
    if (isDefined(object.x) && isDefined(object.y) && isDefined(object.id)) {
      lookup[object.x + object.y * board.width] = object.id
    }
  })

  board.lookup = ref(lookup)
}

export function objectreadkind(
  book: BOOK,
  object: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (isDefined(object) && isDefined(object.kind)) {
    return readaddress(book, CONTENT_TYPE.OBJECT, object.kind)
  }
  return undefined
}

export function boardtick(os: OS, book: BOOK, board: BOARD) {
  // build object lookup pre-tick
  boardsetlookup(board)

  // iterate through objects
  Object.values(board.objects).forEach((target) => {
    if (!isDefined(target.id)) {
      return
    }
    // lookup kind
    const kind = objectreadkind(book, target)
    // object code
    const code = target.code ?? kind?.code ?? ''
    // we have code to execute
    if (code) {
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
    // what else ???
  })

  // cleanup objects flagged for deletion
}
