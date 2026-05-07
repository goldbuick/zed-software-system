import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { CATEGORY, COLLISION, NAME } from 'zss/words/types'

import { memoryboardelementindex } from './boardaccess'
import { memoryreadelementkind, memoryreadelementstat } from './boards'
import { memoryreadelementdisplay } from './bookoperations'
import {
  memoryapplyelementstats,
  memoryreadcodepagestatsfromtext,
} from './codepageoperations'
import {
  memoryensureboardelementruntime,
  memoryensureboardruntime,
  memoryreadboardruntime,
} from './runtimeboundary'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

// quick lookup utils

export function memorywriteboardnamed(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  index?: number,
) {
  // invalid data
  if (!ispresent(board) || !ispresent(element)) {
    return
  }
  const boardruntime = memoryensureboardruntime(board)
  if (!ispresent(boardruntime.named)) {
    return
  }
  // update named
  const kindname = memoryensureboardelementruntime(element).kinddata?.name
  const name = NAME(element.name ?? kindname ?? '')
  if (!boardruntime.named[name]) {
    boardruntime.named[name] = new Set<string>()
  }
  // object.id or terrain index
  boardruntime.named[name].add(element?.id ?? index ?? '')
}

export function memorywriteboardobjectlookup(
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  // invalid data
  if (!ispresent(board) || !ispresent(object?.id)) {
    return
  }
  const boardruntime = memoryensureboardruntime(board)
  if (!ispresent(boardruntime.lookup)) {
    return
  }
  // update object lookup
  if (
    !ispresent(object.removed) &&
    memoryreadelementstat(object, 'collision') !== COLLISION.ISGHOST
  ) {
    const x = object.x ?? 0
    const y = object.y ?? 0
    boardruntime.lookup[x + y * BOARD_WIDTH] = object.id
  }
}

export function memorydeleteboardobjectnamedlookup(
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(board) && ispresent(object?.id)) {
    const boardruntime = memoryreadboardruntime(board)
    // remove from lookup
    if (
      ispresent(boardruntime?.lookup) &&
      ispresent(object.x) &&
      ispresent(object.y)
    ) {
      const index = object.x + object.y * BOARD_WIDTH
      if (boardruntime.lookup[index] === object.id) {
        boardruntime.lookup[index] = undefined
      }
    }
    // remove from named
    const display = memoryreadelementdisplay(object)
    if (
      ispresent(boardruntime?.named?.[display.name]) &&
      ispresent(object.id)
    ) {
      boardruntime.named[display.name].delete(object.id)
    }
  }
}

export function memoryresetboardlookups(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // reset all lookups
  const boardruntime = memoryensureboardruntime(board)
  delete boardruntime.named
  delete boardruntime.lookup

  // make sure lookup is created
  memoryinitboardlookup(board)
}

export function memoryinitboardlookup(board: MAYBE<BOARD>) {
  // invalid data
  if (!ispresent(board)) {
    return
  }

  // already cached
  const boardruntime = memoryensureboardruntime(board)
  if (ispresent(boardruntime.lookup) && ispresent(boardruntime.named)) {
    return
  }

  // build initial cache
  const lookup: string[] = new Array(BOARD_WIDTH * BOARD_HEIGHT).fill(undefined)
  const named: Record<string, Set<string | number>> = {}

  // add objects to lookup & to named
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (
      ispresent(object.x) &&
      ispresent(object.y) &&
      ispresent(object.id) &&
      !ispresent(object.removed)
    ) {
      // add category
      memoryensureboardelementruntime(object).category = CATEGORY.ISOBJECT

      // update lookup
      if (memoryreadelementstat(object, 'collision') !== COLLISION.ISGHOST) {
        lookup[object.x + object.y * BOARD_WIDTH] = object.id
      }

      // read code to get name
      if (isstring(object.code) && !ispresent(object.name)) {
        memoryapplyelementstats(
          memoryreadcodepagestatsfromtext(object.code),
          object,
        )
      }

      // update named lookup
      const display = memoryreadelementdisplay(object)
      if (!named[display.name]) {
        named[display.name] = new Set<string>()
      }
      named[display.name].add(object.id)
    }
  }

  // add terrain to named
  let x = 0
  let y = 0
  for (let i = 0; i < board.terrain.length; ++i) {
    const terrain = board.terrain[i]
    if (ispresent(terrain)) {
      // add coords
      terrain.x = x
      terrain.y = y
      memoryensureboardelementruntime(terrain).category = CATEGORY.ISTERRAIN

      // update named lookup
      const display = memoryreadelementdisplay(memoryreadelementkind(terrain))
      if (!named[display.name]) {
        named[display.name] = new Set<string>()
      }
      named[display.name].add(i)
    }
    ++x
    if (x >= BOARD_WIDTH) {
      x = 0
      ++y
    }
  }

  boardruntime.lookup = lookup
  boardruntime.named = named
}

export function memorydeleteboardterrainnamed(
  board: MAYBE<BOARD>,
  terrain: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(board) && ispresent(terrain?.x) && ispresent(terrain.y)) {
    const boardruntime = memoryreadboardruntime(board)
    // remove from named
    const display = memoryreadelementdisplay(terrain)
    const index = memoryboardelementindex(board, terrain)
    if (ispresent(boardruntime?.named?.[display.name])) {
      boardruntime.named[display.name].delete(index)
    }
  }
}
