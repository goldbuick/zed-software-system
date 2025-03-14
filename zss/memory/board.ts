import { indextopt } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { MAYBE, deepcopy, isnumber, ispresent, noop } from 'zss/mapping/types'
import {
  dirfrompts,
  ispt,
  mapstrdirtoconst,
  ptapplydir,
  STR_DIR,
} from 'zss/words/dir'
import { DIR, PT } from 'zss/words/types'

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

export function boardevaldir(
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  player: string,
  dir: STR_DIR,
  startpt: PT,
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
  const flow = dirfrompts(lpt, pt)
  const xmax = BOARD_WIDTH - 1
  const ymax = BOARD_HEIGHT - 1
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
        const playerobject = boardfindplayer(board, target, player)
        if (ispt(playerobject)) {
          ptapplydir(pt, dirfrompts(startpt, playerobject))
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
      case DIR.CW:
      case DIR.CCW:
      case DIR.OPP:
      case DIR.RNDP: {
        const modpt = boardevaldir(
          board,
          target,
          player,
          dir.slice(i + 1),
          startpt,
        )
        // reset to startpt
        pt.x = startpt.x
        pt.y = startpt.y
        switch (dirconst) {
          case DIR.CW:
            switch (dirfrompts(startpt, modpt)) {
              case DIR.NORTH:
                ptapplydir(pt, DIR.EAST)
                break
              case DIR.SOUTH:
                ptapplydir(pt, DIR.WEST)
                break
              case DIR.EAST:
                ptapplydir(pt, DIR.SOUTH)
                break
              case DIR.WEST:
                ptapplydir(pt, DIR.NORTH)
                break
            }
            break
          case DIR.CCW:
            switch (dirfrompts(startpt, modpt)) {
              case DIR.NORTH:
                ptapplydir(pt, DIR.WEST)
                break
              case DIR.SOUTH:
                ptapplydir(pt, DIR.EAST)
                break
              case DIR.EAST:
                ptapplydir(pt, DIR.NORTH)
                break
              case DIR.WEST:
                ptapplydir(pt, DIR.SOUTH)
                break
            }
            break
          case DIR.OPP:
            switch (dirfrompts(startpt, modpt)) {
              case DIR.NORTH:
                ptapplydir(pt, DIR.SOUTH)
                break
              case DIR.SOUTH:
                ptapplydir(pt, DIR.NORTH)
                break
              case DIR.EAST:
                ptapplydir(pt, DIR.WEST)
                break
              case DIR.WEST:
                ptapplydir(pt, DIR.EAST)
                break
            }
            break
          case DIR.RNDP:
            switch (dirfrompts(startpt, modpt)) {
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
        break
      }
    }
  }

  return pt
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
