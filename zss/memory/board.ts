import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { indextopt, ptdist, ptwithin } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import {
  MAYBE,
  deepcopy,
  isnumber,
  ispresent,
  isstring,
  noop,
} from 'zss/mapping/types'
import {
  EVAL_DIR,
  STR_DIR,
  dirfromdelta,
  dirfrompts,
  ispt,
  mapstrdirtoconst,
  ptapplydir,
} from 'zss/words/dir'
import { DIR, PT } from 'zss/words/types'

import { listnamedelements, picknearestpt } from './atomics'
import { exportboardelement, importboardelement } from './boardelement'
import {
  boardobjectnamedlookupdelete,
  boardterrainnameddelete,
} from './boardlookup'
import { boardreadpath } from './boardpathing'
import { bookelementdisplayread } from './book'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from './types'

import {
  memoryboardread,
  memoryelementstatread,
  memorypickcodepagewithtype,
} from '.'

function createempty() {
  return new Array(BOARD_WIDTH * BOARD_HEIGHT).map(() => undefined)
}

export function createboard(fn = noop<BOARD>) {
  const board: BOARD = {
    terrain: createempty(),
    objects: {},
    // runtime
    id: '',
    name: '',
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
  graphics,
  b1,
  b2,
  b3,
  b4,
  b5,
  b6,
  b7,
  b8,
  b9,
  b10,
  charset,
  palette,
}

export function exportboard(board: MAYBE<BOARD>): MAYBE<FORMAT_OBJECT> {
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(exportboardelement),
    objects: (objects) =>
      Object.values<BOARD_ELEMENT>(objects)
        .filter((boardelement) => !boardelement.removed)
        .map(exportboardelement),
    id: FORMAT_SKIP,
    name: FORMAT_SKIP,
    named: FORMAT_SKIP,
    lookup: FORMAT_SKIP,
    codepage: FORMAT_SKIP,
    distmaps: FORMAT_SKIP,
    overboard: FORMAT_SKIP,
    underboard: FORMAT_SKIP,
    charsetpage: FORMAT_SKIP,
    palettepage: FORMAT_SKIP,
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

export function ptwithinboard(pt: PT) {
  return ptwithin(pt.x, pt.y, 0, BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0)
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

export function boardobjectsread(board: MAYBE<BOARD>): BOARD_ELEMENT[] {
  if (!ispresent(board)) {
    return []
  }
  return [...Object.values(board.objects)]
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

export function boardsafedelete(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  timestamp: number,
) {
  if (
    !ispresent(element) ||
    bookelementdisplayread(element).name === 'player'
  ) {
    return false
  }

  if (element.id) {
    // mark for cleanup
    element.removed = timestamp
    // drop from luts
    boardobjectnamedlookupdelete(board, element)
  } else {
    boardsetterrain(board, {
      x: element?.x ?? 0,
      y: element?.y ?? 0,
    })
    // drop from luts
    boardterrainnameddelete(board, element)
  }

  return true
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

// evals directions into a PT
export function boardevaldir(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
  dir: STR_DIR,
  startpt: PT,
): EVAL_DIR {
  const layer: DIR = DIR.MID
  if (!ispresent(board) || !ispresent(element)) {
    return { dir, startpt, destpt: startpt, layer, targets: [] }
  }

  const pt: PT = {
    x: element.x ?? 0,
    y: element.y ?? 0,
  }
  const step: PT = {
    x: pt.x + (element.stepx ?? 0),
    y: pt.y + (element.stepy ?? 0),
  }

  // we need to know current flow etc..
  const flow = dirfrompts(pt, step)
  const BOARD_MAX_X = BOARD_WIDTH - 1
  const BOARD_MAX_Y = BOARD_HEIGHT - 1
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
          pt.x = clamp(pt.x + x, 0, BOARD_MAX_X)
          pt.y = clamp(pt.y + y, 0, BOARD_MAX_Y)
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.TO: {
        // TO <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = clamp(x, 0, BOARD_MAX_X)
          pt.y = clamp(y, 0, BOARD_MAX_Y)
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.AT: {
        // AT <dir> + <dir>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = clamp(x, 0, BOARD_MAX_X)
          pt.y = clamp(y, 0, BOARD_MAX_Y)
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.FLOW:
        ptapplydir(pt, flow)
        break
      case DIR.SEEK: {
        const playerobject = boardfindplayer(board, element, player)
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
        const modeval = boardevaldir(
          board,
          element,
          player,
          dir.slice(i + 1),
          startpt,
        )

        // reset to startpt
        pt.x = startpt.x
        pt.y = startpt.y
        switch (dirconst) {
          case DIR.CW:
            switch (dirfrompts(startpt, modeval.destpt)) {
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
            switch (dirfrompts(startpt, modeval.destpt)) {
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
            switch (dirfrompts(startpt, modeval.destpt)) {
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
            switch (dirfrompts(startpt, modeval.destpt)) {
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

        // result
        return { dir, startpt, destpt: pt, layer, targets: [] }
      }
      // pathfinding
      case DIR.FLEE: {
        // run away from nearest kind
        break
      }
      case DIR.AWAY: {
        // AWAY <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          const dest = {
            x: clamp(x, 0, BOARD_MAX_X),
            y: clamp(y, 0, BOARD_MAX_Y),
          }
          const dx = dest.x - pt.x
          const dy = dest.y - pt.y
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            const collision = memoryelementstatread(element, 'collision')
            const maybept = boardreadpath(board, collision, pt, dest, true)
            // check dest spot for blocked
            if (
              ispresent(maybept) &&
              maybept.x !== x &&
              maybept.y !== y &&
              !boardobjectreadbypt(board, maybept)
            ) {
              pt.x = maybept.x
              pt.y = maybept.y
            }
          } else {
            // no pathing needed
            const dir = dirfromdelta(-dx, -dy)
            ptapplydir(pt, dir)
          }
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.FIND: {
        // seek nearest kind
        break
      }
      case DIR.TOWARD: {
        // TOWARD <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          const dest = {
            x: clamp(x, 0, BOARD_MAX_X),
            y: clamp(y, 0, BOARD_MAX_Y),
          }
          const dx = dest.x - pt.x
          const dy = dest.y - pt.y
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            const collision = memoryelementstatread(element, 'collision')
            const maybept = boardreadpath(board, collision, pt, dest, false)
            // check dest spot for blocked
            if (
              ispresent(maybept) &&
              maybept.x !== x &&
              maybept.y !== y &&
              !boardobjectreadbypt(board, maybept)
            ) {
              pt.x = maybept.x
              pt.y = maybept.y
            }
          } else {
            // no pathing needed
            const dir = dirfromdelta(dx, dy)
            ptapplydir(pt, dir)
          }
        }
        // need to skip args
        i += 2
        break
      }
      // layers
      case DIR.MID:
      case DIR.OVER:
      case DIR.UNDER:
      case DIR.GROUND: {
        const modeval = boardevaldir(
          board,
          element,
          player,
          dir.slice(i + 1),
          startpt,
        )
        // set layer to correct const
        modeval.layer = dirconst
        return modeval
      }
      // distance specifiers
      case DIR.WITHIN: {
        const [amount] = dir.slice(i + 1)
        const modeval = boardevaldir(
          board,
          element,
          player,
          dir.slice(i + 2),
          startpt,
        )

        // process range
        if (modeval.targets.length === 0 && isnumber(amount) && amount > 0) {
          // add targets within range of
          for (let y = -amount; y <= amount; ++y) {
            for (let x = -amount; x <= amount; ++x) {
              const pt = {
                x: modeval.destpt.x + x,
                y: modeval.destpt.y + y,
              }
              if (ptwithinboard(pt)) {
                modeval.targets.push(pt)
              }
            }
          }
        }

        // add targets within range of
        if (isnumber(amount) && amount > 0) {
          return {
            ...modeval,
            targets: modeval.targets.filter((maybept) => {
              if (ispt(maybept)) {
                const dist = ptdist(maybept, modeval.destpt)
                return dist <= amount
              }
              return false
            }),
          }
        }

        return modeval
      }
      case DIR.AWAYBY: {
        const [amount] = dir.slice(i + 1)
        const modeval = boardevaldir(
          board,
          element,
          player,
          dir.slice(i + 2),
          startpt,
        )

        // process range
        if (modeval.targets.length === 0) {
          // add targets within range of
          for (let y = -BOARD_WIDTH; y <= BOARD_WIDTH; ++y) {
            for (let x = -BOARD_WIDTH; x <= BOARD_WIDTH; ++x) {
              const pt = {
                x: modeval.destpt.x + x,
                y: modeval.destpt.y + y,
              }
              if (ptwithinboard(pt)) {
                modeval.targets.push(pt)
              }
            }
          }
        }

        // add targets within range of
        if (isnumber(amount) && amount > 0) {
          return {
            ...modeval,
            targets: modeval.targets.filter((maybept) => {
              if (ispt(maybept)) {
                const dist = ptdist(maybept, modeval.destpt)
                return dist >= amount
              }
              return false
            }),
          }
        }

        return modeval
      }
    }
  }

  // result
  return { dir, startpt, destpt: pt, layer, targets: [] }
}

export function boardvisualsupdate(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // see if we have an over board
  if (isstring(board.over)) {
    if (isstring(board.overboard)) {
      // validate cached resolve is still valid
      const over = memoryboardread(board.overboard)
      if (!ispresent(over)) {
        delete board.overboard
      }
    } else {
      // check to see if board.over is a stat
      const maybeboard = memoryboardread(board.over)
      if (ispresent(maybeboard)) {
        board.overboard = maybeboard.id
      }
    }
  } else if (isstring(board.overboard)) {
    // over stat is no longer set
    delete board.overboard
  }

  // see if we have an under board
  if (isstring(board.under)) {
    if (isstring(board.underboard)) {
      // validate cached resolve is still valid
      const under = memoryboardread(board.underboard)
      if (!ispresent(under)) {
        delete board.underboard
      }
    } else {
      // check to see if board.under is a stat
      const maybeboard = memoryboardread(board.under)
      if (ispresent(maybeboard)) {
        board.underboard = maybeboard.id
      }
    }
  } else if (isstring(board.underboard)) {
    // under stat is no longer set
    delete board.underboard
  }

  // see if we have a valid charset
  if (isstring(board.charset)) {
    if (isstring(board.charsetpage)) {
      const charset = memorypickcodepagewithtype(
        CODE_PAGE_TYPE.CHARSET,
        board.charset,
      )
      if (!ispresent(charset)) {
        delete board.charsetpage
      }
    } else {
      const maybecharset = memorypickcodepagewithtype(
        CODE_PAGE_TYPE.CHARSET,
        board.charset,
      )
      if (ispresent(maybecharset)) {
        board.charsetpage = maybecharset.id
      }
    }
  } else if (isstring(board.charsetpage)) {
    delete board.charsetpage
  }

  // see if we have a valid palette
  if (isstring(board.palette)) {
    if (isstring(board.palettepage)) {
      const palette = memorypickcodepagewithtype(
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (!ispresent(palette)) {
        delete board.palettepage
      }
    } else {
      const maybepalette = memorypickcodepagewithtype(
        CODE_PAGE_TYPE.PALETTE,
        board.palette,
      )
      if (ispresent(maybepalette)) {
        board.palettepage = maybepalette.id
      }
    }
  } else if (isstring(board.palettepage)) {
    delete board.palettepage
  }
}
