import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { CATEGORY, COLLISION, NAME } from 'zss/words/types'

import { boardelementindex } from './board'
import { bookelementdisplayread } from './book'
import {
  codepageapplyelementstats,
  codepagereadstatsfromtext,
} from './codepage'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

import { memoryelementkindread, memoryelementstatread } from '.'

// quick lookup utils

export function boardsetlookup(board: MAYBE<BOARD>) {
  // invalid data
  if (!ispresent(board)) {
    return
  }

  // already cached
  if (ispresent(board.lookup) && ispresent(board.named)) {
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
      !ispresent(object.removed) &&
      memoryelementstatread(object, 'collision') !== COLLISION.ISGHOST
    ) {
      // add category
      object.category = CATEGORY.ISOBJECT

      // update lookup
      lookup[object.x + object.y * BOARD_WIDTH] = object.id

      // read code to get name
      if (isstring(object.code) && !ispresent(object.name)) {
        codepageapplyelementstats(
          codepagereadstatsfromtext(object.code),
          object,
        )
      }

      // update named lookup
      const display = bookelementdisplayread(object)
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
      terrain.category = CATEGORY.ISTERRAIN

      // update named lookup
      const display = bookelementdisplayread(memoryelementkindread(terrain))
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

  board.lookup = lookup
  board.named = named
}

export function boardresetlookups(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // reset all lookups
  delete board.named
  delete board.lookup

  // make sure lookup is created
  boardsetlookup(board)
}

export function boardnamedwrite(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  index?: number,
) {
  // invalid data
  if (!ispresent(board) || !ispresent(board.named) || !ispresent(element)) {
    return
  }
  // update named
  const name = NAME(element.name ?? element.kinddata?.name ?? '')
  if (!board.named[name]) {
    board.named[name] = new Set<string>()
  }
  // object.id or terrain index
  board.named[name].add(element?.id ?? index ?? '')
}

export function boardobjectlookupwrite(
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  // invalid data
  if (!ispresent(board) || !ispresent(board.lookup) || !ispresent(object?.id)) {
    return
  }
  // update object lookup
  if (
    !ispresent(object.removed) &&
    memoryelementstatread(object, 'collision') !== COLLISION.ISGHOST
  ) {
    const x = object.x ?? 0
    const y = object.y ?? 0
    board.lookup[x + y * BOARD_WIDTH] = object.id
  }
}

export function boardterrainnameddelete(
  board: MAYBE<BOARD>,
  terrain: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(board) && ispresent(terrain?.x) && ispresent(terrain.y)) {
    // remove from named
    const display = bookelementdisplayread(terrain)
    const index = boardelementindex(board, terrain)
    if (ispresent(board.named?.[display.name])) {
      board.named[display.name].delete(index)
    }
  }
}

export function boardobjectnamedlookupdelete(
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(board) && ispresent(object?.id)) {
    // remove from lookup
    if (ispresent(board.lookup) && ispresent(object.x) && ispresent(object.y)) {
      const index = object.x + object.y * BOARD_WIDTH
      if (board.lookup[index] === object.id) {
        board.lookup[index] = undefined
      }
    }
    // remove from named
    const display = bookelementdisplayread(object)
    if (ispresent(board.named?.[display.name]) && ispresent(object.id)) {
      board.named[display.name].delete(object.id)
    }
  }
}
