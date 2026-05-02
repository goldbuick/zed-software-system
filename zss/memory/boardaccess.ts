import { indextopt, pttoindex } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import { PT } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import {
  memorylistboardnamedelements,
  memorypickboardnearestpt,
} from './spatialqueries'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

export function memoryreadidorindex(element: BOARD_ELEMENT) {
  return memoryboardelementisobject(element)
    ? element.id
    : pttoindex({ x: element.x ?? 0, y: element.y ?? 0 }, BOARD_WIDTH)
}

export function memoryboardelementindex(
  board: MAYBE<BOARD>,
  pt: MAYBE<PT | BOARD_ELEMENT>,
): number {
  if (
    !ispresent(board) ||
    !ispresent(pt?.x) ||
    !ispresent(pt?.y) ||
    pt.x < 0 ||
    pt.x >= BOARD_WIDTH ||
    pt.y < 0 ||
    pt.y >= BOARD_HEIGHT
  ) {
    return -1
  }
  return pt.x + pt.y * BOARD_WIDTH
}

export function memoryreadterrain(
  board: MAYBE<BOARD>,
  x: number,
  y: number,
): MAYBE<BOARD_ELEMENT> {
  return ((x >= 0 && x < BOARD_WIDTH) ?? (y >= 0 && y < BOARD_HEIGHT))
    ? board?.terrain[x + y * BOARD_WIDTH]
    : undefined
}

export function memoryreadobject(
  board: MAYBE<BOARD>,
  id: string,
): MAYBE<BOARD_ELEMENT> {
  if (!board) {
    return undefined
  }
  return board.objects[id]
}

export function memoryreadobjectbypt(
  board: MAYBE<BOARD>,
  pt: PT,
): MAYBE<BOARD_ELEMENT> {
  const index = memoryboardelementindex(board, pt)
  if (index < 0 || !ispresent(board?.lookup)) {
    return undefined
  }
  const object = memoryreadobject(board, board.lookup[index] ?? '')
  if (ispresent(object)) {
    return object
  }
  return undefined
}

export function memoryreadelement(
  board: MAYBE<BOARD>,
  pt: PT,
  nolookup?: boolean,
): MAYBE<BOARD_ELEMENT> {
  const index = memoryboardelementindex(board, pt)
  if (index < 0 || !ispresent(board)) {
    return undefined
  }

  let object: MAYBE<BOARD_ELEMENT>
  if (nolookup === true) {
    object = Object.values(board.objects).find(
      (el) => el.x === pt.x && el.y === pt.y && !el.removed,
    )
  } else if (ispresent(board.lookup)) {
    object = memoryreadobject(board, board.lookup[index] ?? '')
  }

  if (ispresent(object)) {
    return object
  }
  return board.terrain[index]
}

export function memoryreadelementbyidorindex(
  board: MAYBE<BOARD>,
  idorindex: string,
) {
  const maybeobject = memoryreadobject(board, idorindex)
  if (ispresent(maybeobject)) {
    return maybeobject
  }
  const maybeindex = parseFloat(idorindex)
  const pt = indextopt(isNaN(maybeindex) ? -1 : maybeindex, BOARD_WIDTH)
  return memoryreadterrain(board, pt.x, pt.y)
}

export function memoryreadobjects(board: MAYBE<BOARD>): BOARD_ELEMENT[] {
  if (!ispresent(board)) {
    return []
  }
  return [...Object.values(board.objects)]
}

export function memoryfindboardplayer(
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  player: string,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(target)) {
    return undefined
  }
  const playerobject = board.objects[player]
  if (ispresent(playerobject)) {
    return playerobject
  }
  if (!ispt(target)) {
    return undefined
  }
  return memorypickboardnearestpt(
    target,
    memorylistboardnamedelements(board, 'player'),
  )
}

export function memoryreadplayersonboard(board: MAYBE<BOARD>): string[] {
  if (!ispresent(board)) {
    return []
  }
  return Object.keys(board.objects).filter(ispid)
}
