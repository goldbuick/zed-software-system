import { indextopt } from 'zss/mapping/2d'
import { createsid } from 'zss/mapping/guid'
import { MAYBE, deepcopy, ispresent, noop } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import { PT } from 'zss/words/types'

import { listnamedelements, picknearestpt } from './atomics'
import { exportboardelement, importboardelement } from './boardelement'
import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from './format'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

function createempty() {
  return new Array(BOARD_WIDTH * BOARD_HEIGHT).map(() => undefined)
}

export function createboard(fn = noop<BOARD>) {
  const board: BOARD = {
    terrain: createempty(),
    objects: {},
    // runtime
    id: '',
  }
  return fn(board)
}

enum BOARD_KEYS {
  terrain,
  objects,
  isdark,
  over,
  under,
  exitnorth,
  exitsouth,
  exitwest,
  exiteast,
  timelimit,
  restartonzap,
  maxplayershots,
  camera,
}

export function exportboard(board: MAYBE<BOARD>): MAYBE<FORMAT_OBJECT> {
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(exportboardelement),
    objects: (objects) =>
      Object.values<BOARD_ELEMENT>(objects)
        .filter((boardelement) => !boardelement.removed)
        .map(exportboardelement),
    id: FORMAT_SKIP,
    named: FORMAT_SKIP,
    lookup: FORMAT_SKIP,
    codepage: FORMAT_SKIP,
    distmaps: FORMAT_SKIP,
    overboard: FORMAT_SKIP,
    underboard: FORMAT_SKIP,
  })
}

export function importboard(boardentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOARD> {
  return unformatobject(boardentry, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(importboardelement),
    objects: (elements) => {
      const objects: Record<string, BOARD_ELEMENT> = {}
      for (let i = 0; i < elements.length; ++i) {
        const obj = importboardelement(elements[i])
        if (ispresent(obj?.id)) {
          objects[obj.id] = obj
        }
      }
      return objects
    },
  })
}

export function boardelementindex(
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

export function boardelementread(
  board: MAYBE<BOARD>,
  pt: PT,
): MAYBE<BOARD_ELEMENT> {
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

export function boardelementreadbyidorindex(
  board: MAYBE<BOARD>,
  idorindex: string,
) {
  const maybeobject = boardobjectread(board, idorindex)
  if (ispresent(maybeobject)) {
    return maybeobject
  }
  const maybeindex = parseFloat(idorindex)
  const pt = indextopt(isNaN(maybeindex) ? -1 : maybeindex, BOARD_WIDTH)
  return boardgetterrain(board, pt.x, pt.y)
}

export function boardgetterrain(
  board: MAYBE<BOARD>,
  x: number,
  y: number,
): MAYBE<BOARD_ELEMENT> {
  return ((x >= 0 && x < BOARD_WIDTH) ?? (y >= 0 && y < BOARD_HEIGHT))
    ? board?.terrain[x + y * BOARD_WIDTH]
    : undefined
}

export function boardsetterrain(
  board: MAYBE<BOARD>,
  from: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (
    !ispresent(board) ||
    !ispresent(from) ||
    !ispresent(from.x) ||
    !ispresent(from.y) ||
    from.x < 0 ||
    from.x >= BOARD_WIDTH ||
    from.y < 0 ||
    from.y >= BOARD_HEIGHT
  ) {
    return undefined
  }

  // add to terrain
  const terrain = deepcopy(from)
  const index = from.x + from.y * BOARD_WIDTH
  board.terrain[index] = terrain

  // clear pathing cache
  delete board.distmaps

  // return created element
  return board.terrain[index]
}

export function boardobjectcreate(
  board: MAYBE<BOARD>,
  from: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(from)) {
    return undefined
  }

  // add to board
  const object = deepcopy(from)
  object.id = object.id ?? createsid()
  board.objects[object.id] = object

  // return created element
  return board.objects[object.id]
}

export function boardterrainsetfromkind(
  board: MAYBE<BOARD>,
  pt: PT,
  kind: string,
): MAYBE<BOARD_ELEMENT> {
  return boardsetterrain(board, { ...pt, kind })
}

export function boardobjectcreatefromkind(
  board: MAYBE<BOARD>,
  pt: PT,
  kind: string,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  return boardobjectcreate(board, { ...pt, kind, id })
}

export function boardobjectread(
  board: MAYBE<BOARD>,
  id: string,
): MAYBE<BOARD_ELEMENT> {
  if (!board) {
    return undefined
  }
  return board.objects[id]
}

export function boardobjectreadbypt(
  board: MAYBE<BOARD>,
  pt: PT,
): MAYBE<BOARD_ELEMENT> {
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

  return undefined
}

export function boarddeleteobject(board: MAYBE<BOARD>, id: string) {
  if (ispresent(board?.objects[id])) {
    delete board.objects[id]
    return true
  }
  return false
}

export function boardfindplayer(
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  player: string,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(target)) {
    return undefined
  }

  // check aggro
  const playerobject = board.objects[player]
  if (ispresent(playerobject)) {
    return playerobject
  }

  // check pt
  if (!ispt(target)) {
    return undefined
  }

  // nearest player to target
  return picknearestpt(target, listnamedelements(board, 'player'))
}
