import { indextopt, pttoindex } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import { COLLISION, PT } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import {
  memorylistboardnamedelements,
  memorypickboardnearestpt,
} from './spatialqueries'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

export type MEMORY_READ_OBJECT_AT_PT_OPTIONS = {
  /** Include ISGHOST objects (default false: occupancy skips ghosts). */
  includeghost?: boolean
}

function memoryobjectisghost(object: BOARD_ELEMENT): boolean {
  if (object.collision === COLLISION.ISGHOST) {
    return true
  }
  return object.kinddata?.collision === COLLISION.ISGHOST
}

/**
 * Authoritative object-at-cell query. Scans board.objects by x/y.
 * Players win on overlap; ghosts are skipped unless includeghost is set.
 */
export function memoryreadobjectatpt(
  board: MAYBE<BOARD>,
  pt: PT,
  options?: MEMORY_READ_OBJECT_AT_PT_OPTIONS,
): MAYBE<BOARD_ELEMENT> {
  if (
    !ispresent(board?.objects) ||
    pt.x < 0 ||
    pt.x >= BOARD_WIDTH ||
    pt.y < 0 ||
    pt.y >= BOARD_HEIGHT
  ) {
    return undefined
  }
  const includeghost = options?.includeghost === true
  const objects = Object.values(board.objects)
  let found: MAYBE<BOARD_ELEMENT>
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]
    if (
      object.x !== pt.x ||
      object.y !== pt.y ||
      !ispresent(object.id) ||
      ispresent(object.removed)
    ) {
      continue
    }
    if (!includeghost && memoryobjectisghost(object)) {
      continue
    }
    if (ispid(object.id)) {
      return object
    }
    found ??= object
  }
  return found
}

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
  return pttoindex({ x: pt.x, y: pt.y }, BOARD_WIDTH)
}

export function memoryreadterrain(
  board: MAYBE<BOARD>,
  x: number,
  y: number,
): MAYBE<BOARD_ELEMENT> {
  return ((x >= 0 && x < BOARD_WIDTH) ?? (y >= 0 && y < BOARD_HEIGHT))
    ? board?.terrain[pttoindex({ x, y }, BOARD_WIDTH)]
    : undefined
}

export function memoryreadobject(
  board: MAYBE<BOARD>,
  id: string,
): MAYBE<BOARD_ELEMENT> {
  if (!board?.objects) {
    return undefined
  }
  return board.objects[id]
}

export function memoryreadobjectbypt(
  board: MAYBE<BOARD>,
  pt: PT,
): MAYBE<BOARD_ELEMENT> {
  return memoryreadobjectatpt(board, pt)
}

export function memoryreadelement(
  board: MAYBE<BOARD>,
  pt: PT,
  options?: MEMORY_READ_OBJECT_AT_PT_OPTIONS,
): MAYBE<BOARD_ELEMENT> {
  const index = memoryboardelementindex(board, pt)
  if (index < 0 || !ispresent(board)) {
    return undefined
  }

  const object = memoryreadobjectatpt(board, pt, options)
  if (ispresent(object)) {
    return object
  }
  return board.terrain[index]
}

export function memoryreadelementbyidorindex(
  board: MAYBE<BOARD>,
  idorindex: string | number | undefined,
) {
  if (idorindex === undefined || idorindex === null) {
    return undefined
  }
  const key = `${idorindex}`
  const maybeobject = memoryreadobject(board, key)
  if (ispresent(maybeobject)) {
    return maybeobject
  }
  const maybeindex = parseFloat(key)
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
