import {
  PT,
  DIR,
  STR_DIR,
  dirfrompts,
  ispt,
  STR_COLOR,
  isstrcolor,
  ptapplydir,
  mapstrdirtoconst,
  mapstrcolortoattributes,
} from 'zss/firmware/wordtypes'
import { COLOR } from 'zss/gadget/data/types'
import { pick } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { MAYBE, isnumber, ispresent, noop } from 'zss/mapping/types'

import { listnamedelements, picknearestpt } from './atomics'
import { BIN_BOARD } from './binary'
import {
  createboardelement,
  exportboardelement,
  importboardelement,
} from './boardelement'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'
import { exportword, importword } from './word'

import { memoryreadchip } from '.'

const BOARD_TERRAIN: BOARD_ELEMENT[] = new Array(
  BOARD_WIDTH * BOARD_HEIGHT,
).map(() => createboardelement())

export function createboardstats() {
  return {}
}

export function createboard(fn = noop<BOARD>) {
  const board: BOARD = {
    terrain: BOARD_TERRAIN.slice(0),
    objects: {},
    // runtime
    codepage: '',
  }
  return fn(board)
}

// safe to serialize copy of board
export function exportboard(board: MAYBE<BOARD>): MAYBE<BIN_BOARD> {
  if (!ispresent(board)) {
    return
  }
  return {
    terrain: board.terrain.map(exportboardelement).filter(ispresent),
    objects: Object.keys(board.objects)
      .map((name) => exportboardelement(board.objects[name]))
      .filter(ispresent),
    // stats
    isdark: exportword(board.isdark),
    over: exportword(board.over),
    under: exportword(board.under),
    exitnorth: exportword(board.exitnorth),
    exitsouth: exportword(board.exitsouth),
    exitwest: exportword(board.exitwest),
    exiteast: exportword(board.exiteast),
    timelimit: exportword(board.timelimit),
    restartonzap: exportword(board.restartonzap),
    maxplayershots: exportword(board.maxplayershots),
  }
}

// import json into board
export function importboard(board: MAYBE<BIN_BOARD>): MAYBE<BOARD> {
  if (!ispresent(board)) {
    return
  }
  return {
    terrain: board.terrain.map(importboardelement).filter(ispresent),
    objects: Object.fromEntries<BOARD_ELEMENT>(
      board.objects
        .map(importboardelement)
        .filter((object) => ispresent(object))
        .map((value) => [value?.id ?? '', value]),
    ),
    // stats
    isdark: importword(board.isdark) as any,
    over: importword(board.over) as any,
    under: importword(board.under) as any,
    exitnorth: importword(board.exitnorth) as any,
    exitsouth: importword(board.exitsouth) as any,
    exitwest: importword(board.exitwest) as any,
    exiteast: importword(board.exiteast) as any,
    timelimit: importword(board.timelimit) as any,
    restartonzap: importword(board.restartonzap) as any,
    maxplayershots: importword(board.maxplayershots) as any,
    // runtime
    codepage: '',
  }
}

export function boardelementindex(board: MAYBE<BOARD>, pt: PT): number {
  if (
    !ispresent(board) ||
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

export function boardelementname(element: MAYBE<BOARD_ELEMENT>) {
  return (element?.name ?? element?.kinddata?.name ?? 'object').toLowerCase()
}

export function boardelementcolor(element: MAYBE<BOARD_ELEMENT>) {
  return element?.color ?? element?.kinddata?.color ?? COLOR.BLACK
}

export function boardelementbg(element: MAYBE<BOARD_ELEMENT>) {
  return element?.bg ?? element?.kinddata?.bg ?? COLOR.BLACK
}

export function boardelementapplycolor(
  element: MAYBE<BOARD_ELEMENT>,
  strcolor: STR_COLOR | undefined,
) {
  if (!ispresent(element) || !isstrcolor(strcolor)) {
    return
  }
  const { color, bg } = mapstrcolortoattributes(strcolor)
  if (ispresent(color)) {
    element.color = color
  }
  if (ispresent(bg)) {
    element.bg = bg
  }
}

export function boardgetterrain(
  board: MAYBE<BOARD>,
  x: number,
  y: number,
): MAYBE<BOARD_ELEMENT> {
  return (x >= 0 && x < BOARD_WIDTH) ?? (y >= 0 && y < BOARD_HEIGHT)
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

  const terrain = { ...from }
  const index = from.x + from.y * BOARD_WIDTH
  board.terrain[index] = terrain

  return from
}

export function boardobjectcreate(
  board: MAYBE<BOARD>,
  from: MAYBE<BOARD_ELEMENT>,
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(from)) {
    return undefined
  }

  const object = {
    ...from,
    id: from.id ?? createsid(),
  }

  // add to board
  board.objects[object.id] = object as BOARD_ELEMENT

  // return object
  return object as BOARD_ELEMENT
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
  return boardobjectcreate(board, { ...pt, id: id ?? undefined, kind })
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
  dir: STR_DIR,
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
  const start: PT = { ...pt }
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
        const player = boardfindplayer(board, target)
        if (ispt(player)) {
          ptapplydir(pt, dirfrompts(start, player))
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
      case DIR.CW: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        ptapplydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.CCW: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        ptapplydir(pt, dirfrompts(start, modpt))
        break
      }
      case DIR.OPP: {
        const modpt = boardevaldir(board, target, dir.slice(i + 1))
        ptapplydir(pt, dirfrompts(start, modpt))
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
): MAYBE<BOARD_ELEMENT> {
  if (!ispresent(board) || !ispresent(target)) {
    return undefined
  }

  // check aggro
  const memory = memoryreadchip(target.id ?? '')
  const pid = memory.player ?? ''
  const player = board.objects[pid]
  if (ispresent(player)) {
    return player
  }

  // check pt
  if (!ispt(target)) {
    return undefined
  }

  // nearest player to target
  return picknearestpt(target, listnamedelements(board, 'player'))
}
