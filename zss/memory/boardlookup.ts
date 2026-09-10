import { pttoindex } from 'zss/mapping/2d'
import { MAYBE, ispresent, isstring } from 'zss/mapping/types'
import { CATEGORY, NAME } from 'zss/words/types'

import { memoryreadelementkind } from './boards'
import { memoryreadelementdisplay } from './bookoperations'
import {
  memoryapplyelementstats,
  memoryreadcodepagestatsfromtext,
} from './codepageoperations'
import { BOARD, BOARD_ELEMENT, BOARD_WIDTH } from './types'

// named-index utils (name -> Set of object id | terrain index)

export function memorywriteboardnamed(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  index?: number,
) {
  // invalid data
  if (!ispresent(board) || !ispresent(element)) {
    return
  }
  if (!ispresent(board.named)) {
    return
  }
  // update named
  const kindname = element.kinddata?.name
  const name = NAME(element.name ?? kindname ?? '')
  if (!board.named[name]) {
    board.named[name] = new Set<string>()
  }
  // object.id or terrain index
  board.named[name].add(element?.id ?? index ?? '')
}

export function memorydeleteboardobjectnamedlookup(
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(board) && ispresent(object?.id)) {
    // remove from named
    const display = memoryreadelementdisplay(object)
    if (ispresent(board.named?.[display.name]) && ispresent(object.id)) {
      board.named[display.name].delete(object.id)
    }
  }
}

export function memoryensureterraincoords(board: MAYBE<BOARD>): void {
  if (!ispresent(board?.terrain)) {
    return
  }
  let x = 0
  let y = 0
  for (let i = 0; i < board.terrain.length; ++i) {
    const tile = board.terrain[i]
    if (ispresent(tile)) {
      if (!ispresent(tile.x)) {
        tile.x = x
      }
      if (!ispresent(tile.y)) {
        tile.y = y
      }
    }
    ++x
    if (x >= BOARD_WIDTH) {
      x = 0
      ++y
    }
  }
}

/** Tick/render path: ensure named index + terrain coords without wiping every frame. */
export function memoryensureboardready(board: MAYBE<BOARD>): void {
  if (!ispresent(board)) {
    return
  }
  memoryinitboardnamed(board)
  memoryensureterraincoords(board)
}

/** Structural / tools: wipe and rebuild named index. Not for tick path. */
export function memoryrebuildboardnamed(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  delete board.named

  memoryinitboardnamed(board)
}

export function memoryinitboardnamed(board: MAYBE<BOARD>) {
  // invalid data
  if (!ispresent(board)) {
    return
  }

  // already cached
  if (ispresent(board.named)) {
    return
  }

  // build initial named cache
  const named: Record<string, Set<string | number>> = {}

  // add objects to named
  const objects = ispresent(board.objects) ? Object.values(board.objects) : []
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (
      ispresent(object.x) &&
      ispresent(object.y) &&
      ispresent(object.id) &&
      !ispresent(object.removed)
    ) {
      // add category and kinddata
      object.category = CATEGORY.ISOBJECT
      memoryreadelementkind(object)

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
  const terrain = board.terrain
  if (!ispresent(terrain)) {
    board.named = named
    return
  }
  for (let i = 0; i < terrain.length; ++i) {
    const tile = terrain[i]
    if (ispresent(tile)) {
      // add coords
      tile.x = x
      tile.y = y

      // add category and kinddata
      tile.category = CATEGORY.ISTERRAIN
      memoryreadelementkind(tile)

      // update named lookup
      const display = memoryreadelementdisplay(tile)
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

  board.named = named
}

export function memorydeleteboardterrainnamed(
  board: MAYBE<BOARD>,
  terrain: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(board) && ispresent(terrain?.x) && ispresent(terrain.y)) {
    // remove from named
    const display = memoryreadelementdisplay(terrain)
    const index = pttoindex({ x: terrain.x, y: terrain.y }, BOARD_WIDTH)
    if (ispresent(board.named?.[display.name])) {
      board.named[display.name].delete(index)
    }
  }
}
