import * as bin from 'typed-binary'
import {
  PT,
  DIR,
  STR_DIR,
  dirfrompts,
  ispt,
  STR_COLOR,
  isstrcolor,
  readstrcolor,
  readstrbg,
  ptapplydir,
  mapstrdirtoconst,
} from 'zss/firmware/wordtypes'
import { COLOR } from 'zss/gadget/data/types'
import { pick } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import {
  MAYBE,
  MAYBE_STRING,
  isnumber,
  ispresent,
  noop,
} from 'zss/mapping/types'

import { listnamedelements, picknearestpt } from './atomics'
import {
  BIN_BOARD_ELEMENT,
  BOARD_ELEMENT,
  MAYBE_BOARD_ELEMENT,
  exportboardelement,
  importboardelement,
} from './boardelement'
import { BIN_WORD_ENTRY, exportwordentry, importwordentry, WORD } from './word'

export type BOARD_RECT = {
  x: number
  y: number
  width: number
  height: number
}

export type BOARD_STATS = Record<string, WORD>

export type BOARD = {
  id?: string
  // specifics
  terrain: MAYBE_BOARD_ELEMENT[]
  objects: Record<string, BOARD_ELEMENT>
  // custom
  stats?: BOARD_STATS
  // runtime only
  lookup?: MAYBE_STRING[]
  named?: Record<string, Set<string | number>>
}

export type MAYBE_BOARD = MAYBE<BOARD>

export const BOARD_WIDTH = 60
export const BOARD_HEIGHT = 25
const BOARD_TERRAIN: undefined[] = new Array(BOARD_WIDTH * BOARD_HEIGHT)

export function createboard(fn = noop<BOARD>) {
  const board: BOARD = {
    id: createsid(),
    // specifics
    terrain: BOARD_TERRAIN.slice(0),
    objects: {},
  }
  return fn(board)
}

export const BIN_BOARD = bin.object({
  id: bin.string,
  // specifics
  terrain: bin.dynamicArrayOf(BIN_BOARD_ELEMENT),
  objects: bin.dynamicArrayOf(BIN_BOARD_ELEMENT),
  // custom
  stats: bin.optional(bin.dynamicArrayOf(BIN_WORD_ENTRY)),
})
type BIN_BOARD = bin.Parsed<typeof BIN_BOARD>

// safe to serialize copy of board
export function exportboard(board: MAYBE_BOARD): MAYBE<BIN_BOARD> {
  if (!ispresent(board)) {
    return
  }

  const stats = board.stats ?? {}
  const wordentries = Object.keys(stats)
    .map((name) => exportwordentry(name, stats[name]))
    .filter(ispresent)

  return {
    id: board.id ?? '',
    // specifics
    terrain: board.terrain.map(exportboardelement).filter(ispresent),
    objects: Object.keys(board.objects)
      .map((name) => exportboardelement(board.objects[name]))
      .filter(ispresent),
    // custom
    stats: wordentries,
  }
}

// import json into board
export function importboard(board: MAYBE<BIN_BOARD>): MAYBE_BOARD {
  if (!ispresent(board)) {
    return
  }
  let stats: MAYBE<BOARD_STATS>
  if (board.stats) {
    stats = {}
    for (let i = 0; i < board.stats.length; ++i) {
      const [name, word] = importwordentry(board.stats[i]) ?? []
      if (ispresent(name)) {
        stats[name] = word
      }
    }
  }
  return {
    id: board.id,
    // specifics
    terrain: board.terrain.map(importboardelement).filter(ispresent),
    objects: Object.fromEntries<BOARD_ELEMENT>(
      Object.entries(board.objects).map(([id, object]) => [
        id,
        importboardelement(object),
      ]) as any,
    ),
    // custom
    stats,
  }
}

export function boardwritestat(board: MAYBE_BOARD, key: string, value: WORD) {
  if (!ispresent(board)) {
    return
  }
  board.stats = board.stats ?? {}
  board.stats[key] = value
}

export function boardelementindex(board: MAYBE_BOARD, pt: PT): number {
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
  board: MAYBE_BOARD,
  pt: PT,
): MAYBE_BOARD_ELEMENT {
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

export function boardelementname(element: MAYBE_BOARD_ELEMENT) {
  return (element?.name ?? element?.kinddata?.name ?? 'object').toLowerCase()
}

export function boardelementcolor(element: MAYBE_BOARD_ELEMENT) {
  return element?.color ?? element?.kinddata?.color ?? COLOR.BLACK
}

export function boardelementbg(element: MAYBE_BOARD_ELEMENT) {
  return element?.bg ?? element?.kinddata?.bg ?? COLOR.BLACK
}

export function boardelementapplycolor(
  element: MAYBE_BOARD_ELEMENT,
  strcolor: STR_COLOR | undefined,
) {
  if (!ispresent(element) || !isstrcolor(strcolor)) {
    return
  }
  const color = readstrcolor(strcolor)
  if (ispresent(color)) {
    element.color = color
  }
  const bg = readstrbg(strcolor)
  if (ispresent(bg)) {
    element.bg = bg
  }
}

export function boardgetterrain(
  board: MAYBE_BOARD,
  x: number,
  y: number,
): MAYBE_BOARD_ELEMENT {
  return (x >= 0 && x < BOARD_WIDTH) ?? (y >= 0 && y < BOARD_HEIGHT)
    ? board?.terrain[x + y * BOARD_WIDTH]
    : undefined
}

export function boardsetterrain(
  board: MAYBE_BOARD,
  from: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
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
  board: MAYBE_BOARD,
  from: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(board) || !ispresent(from)) {
    return undefined
  }

  const object = {
    ...from,
    id: from.id ?? createsid(),
  }

  // add to board
  board.objects[object.id] = object

  // return object
  return object
}

export function boardterrainsetfromkind(
  board: MAYBE_BOARD,
  pt: PT,
  kind: string,
): MAYBE_BOARD_ELEMENT {
  return boardsetterrain(board, { ...pt, kind })
}

export function boardobjectcreatefromkind(
  board: MAYBE_BOARD,
  pt: PT,
  kind: string,
  id?: string,
): MAYBE_BOARD_ELEMENT {
  return boardobjectcreate(board, { ...pt, id: id ?? undefined, kind })
}

export function boardobjectread(
  board: MAYBE_BOARD,
  id: string,
): MAYBE_BOARD_ELEMENT {
  if (!board) {
    return undefined
  }
  return board.objects[id]
}

export function boardevaldir(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
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

export function boarddeleteobject(board: MAYBE_BOARD, id: string) {
  if (ispresent(board?.objects[id])) {
    delete board.objects[id]
    return true
  }
  return false
}

export function boardfindplayer(
  board: MAYBE_BOARD,
  target: MAYBE_BOARD_ELEMENT,
): MAYBE_BOARD_ELEMENT {
  if (!ispresent(board) || !ispresent(target)) {
    return undefined
  }

  // check aggro
  const aggro = target.stats?.player ?? ''
  const player = board.objects[aggro]
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
