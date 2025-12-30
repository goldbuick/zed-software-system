import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { indextopt, ptdist, ptwithin } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid, ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import {
  MAYBE,
  deepcopy,
  isnumber,
  ispresent,
  isstring,
  noop,
} from 'zss/mapping/types'
import { STR_COLOR, isstrcolor, mapstrcolortoattributes } from 'zss/words/color'
import {
  EVAL_DIR,
  STR_DIR,
  dirfromdelta,
  dirfrompts,
  ispt,
  mapstrdirtoconst,
  ptapplydir,
} from 'zss/words/dir'
import { CATEGORY, COLLISION, DIR, NAME, PT } from 'zss/words/types'

import { bookelementdisplayread, bookreadflag } from './bookoperations'
import {
  codepageapplyelementstats,
  codepagereadstatsfromtext,
} from './codepageoperations'
import { memorysendtoelement } from './gameloop'
import { bookplayermovetoboard } from './playermanagement'
import {
  boardcheckcollide,
  boardlistnamedelements,
  boardpicknearestpt,
  boardreadpath,
} from './spatialqueries'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from './types'

import {
  memoryboardread,
  memoryelementcheckpushable,
  memoryelementkindread,
  memoryelementstatread,
  memorypickcodepagewithtype,
} from '.'

// From board.ts

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

export function boardexport(board: MAYBE<BOARD>): MAYBE<FORMAT_OBJECT> {
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(boardelementexport),
    objects: (objects) =>
      Object.values<BOARD_ELEMENT>(objects)
        .filter((boardelement) => !boardelement.removed)
        .map(boardelementexport),
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

export function boardimport(boardentry: MAYBE<FORMAT_OBJECT>): MAYBE<BOARD> {
  return unformatobject(boardentry, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(boardelementimport),
    objects: (elements) => {
      const objects: Record<string, BOARD_ELEMENT> = {}
      for (let i = 0; i < elements.length; ++i) {
        const obj = boardelementimport(elements[i])
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
  return boardpicknearestpt(target, boardlistnamedelements(board, 'player'))
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
          pt.x += x
          pt.y += y
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.TO: {
        // TO <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = x
          pt.y = y
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.AT: {
        // AT <dir> + <dir>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = x
          pt.y = y
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
      case DIR.FIND: {
        // seek nearest kind
        break
      }
      case DIR.AWAY: {
        // AWAY <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          const dest = {
            x,
            y,
          }
          const dx = dest.x - pt.x
          const dy = dest.y - pt.y
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            const collision = memoryelementstatread(element, 'collision')
            const maybept = boardreadpath(board, collision, pt, dest, true)
            // check dest spot for blocked
            if (ispresent(maybept) && (maybept.x !== x || maybept.y !== y)) {
              const step = boardobjectreadbypt(board, maybept)
              if (!ispresent(step)) {
                pt.x = maybept.x
                pt.y = maybept.y
              }
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
      case DIR.TOWARD: {
        // TOWARD <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          const dest = {
            x,
            y,
          }
          const dx = dest.x - pt.x
          const dy = dest.y - pt.y
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            const collision = memoryelementstatread(element, 'collision')
            const maybept = boardreadpath(board, collision, pt, dest, false)
            // check dest spot for blocked
            if (ispresent(maybept) && (maybept.x !== x || maybept.y !== y)) {
              const step = boardobjectreadbypt(board, maybept)
              if (!ispresent(step)) {
                pt.x = maybept.x
                pt.y = maybept.y
              }
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
      case DIR.ELEMENTS: {
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
        modeval.targets = []

        // get walking direction
        const inline = dirfrompts(modeval.startpt, modeval.destpt)
        for (let ii = 0; ii < BOARD_WIDTH; ++ii) {
          ptapplydir(pt, inline)
          if (!ptwithinboard(pt)) {
            break
          }
          modeval.targets.push({ x: pt.x, y: pt.y })
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

// object / terrain utils

export function boardcheckblockedobject(
  board: MAYBE<BOARD>,
  collision: MAYBE<COLLISION>,
  dest: PT,
  isplayer = false,
): MAYBE<BOARD_ELEMENT> {
  // first pass clipping
  if (
    !ispresent(board) ||
    !ispresent(board.lookup) ||
    dest.x < 0 ||
    dest.x >= BOARD_WIDTH ||
    dest.y < 0 ||
    dest.y >= BOARD_HEIGHT
  ) {
    // for sending interaction messages
    return {
      name: 'edge',
      kind: 'edge',
      collision: COLLISION.ISSOLID,
      x: dest.x,
      y: dest.y,
    }
  }

  // gather meta for move
  const targetidx = dest.x + dest.y * BOARD_WIDTH

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[targetidx] ?? '404')
  if (ispresent(maybeobject)) {
    if (isplayer) {
      // players do not block players
      if (ispid(maybeobject.id)) {
        return undefined
      }
    }
    // for sending interaction messages
    return maybeobject
  }

  // blocked by terrain
  const maybeterrain = board.terrain[targetidx]
  if (
    ispresent(maybeterrain) &&
    boardcheckcollide(
      collision,
      memoryelementstatread(maybeterrain, 'collision'),
    )
  ) {
    return maybeterrain
  }

  // no interaction
  return undefined
}

export function boardcheckmoveobject(
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): boolean {
  const object = boardobjectread(board, target?.id ?? '')
  const objectx = object?.x ?? -1
  const objecty = object?.y ?? -1
  // first pass, are we actually trying to move ?
  if (objectx - dest.x === 0 && objecty - dest.y === 0) {
    // no interaction due to no movement
    return true
  }
  const collsion = memoryelementstatread(object, 'collision')
  const blockedby = boardcheckblockedobject(board, collsion, dest)
  return ispresent(blockedby)
}

export function boardmoveobject(
  board: MAYBE<BOARD>,
  elementtomove: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): MAYBE<BOARD_ELEMENT> {
  const movingelement = boardobjectread(board, elementtomove?.id ?? '')

  // first pass clipping
  if (
    !ispresent(board) ||
    !ispresent(movingelement) ||
    !ispresent(movingelement.x) ||
    !ispresent(movingelement.y) ||
    !ispresent(board.lookup) ||
    dest.x < 0 ||
    dest.x >= BOARD_WIDTH ||
    dest.y < 0 ||
    dest.y >= BOARD_HEIGHT
  ) {
    // for sending interaction messages
    return {
      name: 'edge',
      kind: 'edge',
      collision: COLLISION.ISSOLID,
      x: dest.x,
      y: dest.y,
    }
  }

  // second pass, are we actually trying to move ?
  if (movingelement.x - dest.x === 0 && movingelement.y - dest.y === 0) {
    // no interaction due to no movement
    return undefined
  }

  // gather meta for move
  const startidx = boardelementindex(board, movingelement)
  const destidx = boardelementindex(board, dest)
  const movingelementcollision = memoryelementstatread(
    movingelement,
    'collision',
  )

  if (movingelementcollision === COLLISION.ISGHOST) {
    // skip ghost
    // update object location
    movingelement.x = dest.x
    movingelement.y = dest.y
    return undefined
  }

  const movingelementisplayer = ispid(movingelement?.id)

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[destidx] ?? '')
  if (memoryelementstatread(maybeobject, 'collision') === COLLISION.ISGHOST) {
    // skip ghost
    return undefined
  }

  const maybeobjectisplayer = ispid(maybeobject?.id ?? '')
  if (
    // we are blocked by an object
    ispresent(maybeobject) &&
    // and we are both NOT players
    (!movingelementisplayer || !maybeobjectisplayer)
  ) {
    // for sending interaction messages
    return { ...maybeobject }
  }

  // blocked by terrain
  const mayberterrain = board.terrain[destidx]
  const terraincollision = memoryelementstatread(mayberterrain, 'collision')

  // if blocked by terrain, bail
  if (boardcheckcollide(movingelementcollision, terraincollision)) {
    // for sending interaction messages
    return { ...mayberterrain, x: dest.x, y: dest.y }
  }

  // update object location
  movingelement.x = dest.x
  movingelement.y = dest.y

  // if not removed, update lookup
  if (!ispresent(movingelement.removed)) {
    // blank current lookup
    board.lookup[startidx] = undefined
    // update lookup at dest
    board.lookup[destidx] = movingelement.id ?? ''
  }

  // no interaction
  return undefined
}

function boardcleanup(board: MAYBE<BOARD>, timestamp: number) {
  const ids: string[] = []
  if (!ispresent(board)) {
    return ids
  }
  // iterate through objects
  const targets = Object.values(board.objects)
  for (let i = 0; i < targets.length; ++i) {
    const target = targets[i]
    // check that we have an id and are marked for removal
    // 5 seconds after marked for removal
    if (ispresent(target.id) && ispresent(target.removed)) {
      const delta = timestamp - target.removed
      if (delta > TICK_FPS * 5) {
        // track dropped ids
        ids.push(target.id)
        // drop from board
        boarddeleteobject(board, target.id)
      }
    }
  }
  return ids
}

// update board

type BOOK_RUN_CODE_TARGETS = {
  object: MAYBE<BOARD_ELEMENT>
  terrain: MAYBE<BOARD_ELEMENT>
}

type BOOK_RUN_CODE = {
  id: string
  code: string
  type: CODE_PAGE_TYPE
}

export type BOOK_RUN_ARGS = BOOK_RUN_CODE_TARGETS & BOOK_RUN_CODE

export function boardtick(board: MAYBE<BOARD>, timestamp: number) {
  const args: BOOK_RUN_ARGS[] = []

  if (!ispresent(board)) {
    return args
  }

  function processlist(list: BOARD_ELEMENT[]) {
    for (let i = 0; i < list.length; ++i) {
      const object = list[i]

      // check that we have an id
      if (!ispresent(object.id)) {
        continue
      }

      // track last position
      object.lx = object.x
      object.ly = object.y

      // lookup kind
      const kind = memoryelementkindread(object)

      // object code is composed of kind code + object code
      const code = `${kind?.code ?? ''}\n${object.code ?? ''}`

      // check that we have code to execute
      if (!code) {
        continue
      }

      // only run if not removed
      // edge case is removed with a pending thud
      // essentially this affords objects that were forcibly removed
      // a single tick before execution ends
      if (object.removed) {
        const delta = timestamp - object.removed
        const cycle = memoryelementstatread(object, 'cycle')
        if (delta > cycle) {
          continue
        }
      }

      // signal id & code
      args.push({
        id: object.id,
        type: CODE_PAGE_TYPE.OBJECT,
        code,
        object,
        terrain: undefined,
      })
    }
  }

  // iterate through objects
  const objects = Object.values(board.objects)

  // execution lists
  const otherlist: BOARD_ELEMENT[] = []
  const ghostlist: BOARD_ELEMENT[] = []
  const playerlist: BOARD_ELEMENT[] = []
  const bulletwaterlist: BOARD_ELEMENT[] = []

  // filter into categories
  for (let i = 0; i < objects.length; ++i) {
    const el = objects[i]
    if (ispid(el.id)) {
      playerlist.push(el)
    } else {
      switch (memoryelementstatread(el, 'collision')) {
        case COLLISION.ISSWIM:
        case COLLISION.ISBULLET:
          bulletwaterlist.push(el)
          break
        case COLLISION.ISGHOST:
          ghostlist.push(el)
          break
        default:
          otherlist.push(el)
          break
      }
    }
  }

  // bullet & water run first
  processlist(bulletwaterlist)

  // players run next
  processlist(playerlist)

  // non-ghost run next
  processlist(otherlist)

  // ghosts run last
  processlist(ghostlist)

  // cleanup objects flagged for deletion
  const stopids = boardcleanup(board, timestamp)
  for (let i = 0; i < stopids.length; ++i) {
    args.push({
      id: stopids[i],
      type: CODE_PAGE_TYPE.ERROR,
      code: '',
      object: undefined,
      terrain: undefined,
    })
  }

  // return code that needs to be run
  return args
}

// working with groups

export function boardreadgroup(
  board: MAYBE<BOARD>,
  self: string,
  targetgroup: string,
) {
  const objectelements: BOARD_ELEMENT[] = []
  const terrainelements: BOARD_ELEMENT[] = []
  if (!ispresent(board)) {
    return { objectelements, terrainelements }
  }

  function checkelement(el: BOARD_ELEMENT, isterrain: boolean) {
    // skip removed elements
    if (el.removed) {
      return false
    }

    // special groups
    switch (targetgroup) {
      case 'all':
        return true
      case 'self':
        return el?.id === self
      case 'others':
        return el?.id !== self
      case 'terrain':
        return isterrain === true
      case 'object':
        return isterrain === false
    }

    // stat & name groups
    const statnamed = memoryelementstatread(
      el,
      targetgroup as BOARD_ELEMENT_STAT,
    )

    return (
      ispresent(statnamed) ||
      bookelementdisplayread(el).name === targetgroup ||
      memoryelementstatread(el, 'group') === targetgroup
    )
  }

  // match elements
  for (let i = 0; i < BOARD_SIZE; ++i) {
    const maybeterrain: MAYBE<BOARD_ELEMENT> = board.terrain[i]
    const maybeobject: MAYBE<BOARD_ELEMENT> =
      board.objects[board.lookup?.[i] ?? '']
    if (ispresent(maybeterrain) && checkelement(maybeterrain, true)) {
      terrainelements.push(maybeterrain)
      // check for magic carpet
      const maybeobject = board.objects[board.lookup?.[i] ?? '']
      if (ispresent(maybeobject) && boardelementisobject(maybeobject)) {
        objectelements.push(maybeobject)
      }
    } else if (
      boardelementisobject(maybeobject) &&
      checkelement(maybeobject, false)
    ) {
      objectelements.push(maybeobject)
    }
  }

  return { objectelements, terrainelements }
}

function playerblockedbyedge(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: BOARD_ELEMENT,
  dest: PT,
) {
  const elementid = element.id ?? ''
  // attempt to move player
  if (dest.x < 0) {
    // exit west
    const destboard = memoryboardread(board?.exitwest ?? '')
    if (ispresent(destboard)) {
      return bookplayermovetoboard(book, elementid, destboard.id, {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      })
    }
  } else if (dest.x >= BOARD_WIDTH) {
    // exit east
    const destboard = memoryboardread(board?.exiteast ?? '')
    if (ispresent(destboard)) {
      return bookplayermovetoboard(book, elementid, destboard.id, {
        x: 0,
        y: dest.y,
      })
    }
  } else if (dest.y < 0) {
    // exit north
    const destboard = memoryboardread(board?.exitnorth ?? '')
    if (ispresent(destboard)) {
      return bookplayermovetoboard(book, elementid, destboard.id, {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      })
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    // exit south
    const destboard = memoryboardread(board?.exitsouth ?? '')
    if (ispresent(destboard)) {
      return bookplayermovetoboard(book, elementid, destboard.id, {
        x: dest.x,
        y: 0,
      })
    }
  }
  return false
}

function playerwaszapped(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
) {
  const enterx = bookreadflag(book, player, 'enterx')
  const entery = bookreadflag(book, player, 'entery')
  if (isnumber(enterx) && isnumber(entery) && ispresent(element)) {
    boardmoveobject(board, element, { x: enterx, y: entery })
  }
}

export function memorymoveobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  dest: PT,
  didpush: Record<string, boolean> = {},
) {
  if (!ispresent(element?.id)) {
    return false
  }

  let blocked = boardmoveobject(board, element, dest)
  const elementcollision = memoryelementstatread(element, 'collision')
  const elementisplayer = ispid(element.id)
  const elementisbullet = elementcollision === COLLISION.ISBULLET

  // bullets can't PUSH, and you can only push object elements
  if (
    elementcollision !== COLLISION.ISBULLET &&
    ispresent(blocked) &&
    boardelementisobject(blocked)
  ) {
    // check terrain __under__ blocked
    const mayberterrain = boardgetterrain(
      board,
      blocked.x ?? -1,
      blocked.y ?? -1,
    )
    const terraincollision = memoryelementstatread(mayberterrain, 'collision')
    if (!boardcheckcollide(elementcollision, terraincollision)) {
      const elementisplayer = ispid(element?.id)

      // is blocked pushable ?
      const isitem = !!memoryelementstatread(blocked, 'item')
      const ispushable = memoryelementcheckpushable(element, blocked)

      // player cannot push items
      const blockedid = blocked.id ?? ''
      if (ispushable && (!elementisplayer || !isitem) && !didpush[blockedid]) {
        didpush[blockedid] = true
        const bumpdir = dirfrompts(
          { x: element.x ?? 0, y: element.y ?? 0 },
          dest,
        )
        const bump = ptapplydir(
          { x: blocked.x ?? 0, y: blocked.y ?? 0 },
          bumpdir,
        )
        if (!memorymoveobject(book, board, blocked, bump) && elementisplayer) {
          memorysendtoelement(element, blocked, 'touch')
        }
      }

      // update blocked by element
      blocked = boardmoveobject(board, element, dest)
    }
  }

  if (ispresent(blocked)) {
    const blockedbyplayer = ispid(blocked.id)
    const blockedisbullet =
      memoryelementstatread(blocked, 'collision') === COLLISION.ISBULLET
    const blockedisedge = blocked.kind === 'edge'
    if (elementisplayer) {
      if (blockedisedge) {
        if (!playerblockedbyedge(book, board, element, dest)) {
          memorysendtoelement(blocked, element, 'thud')
        }
      } else if (blockedisbullet) {
        if (board?.restartonzap) {
          playerwaszapped(book, board, element, element.id ?? '')
        }
        memorysendtoelement(blocked, element, 'shot')
        memorysendtoelement(element, blocked, 'thud')
      } else {
        memorysendtoelement(blocked, element, 'touch')
        memorysendtoelement(element, blocked, 'touch')
      }
    } else if (elementisbullet) {
      if (blockedisbullet) {
        memorysendtoelement(blocked, element, 'thud')
        memorysendtoelement(element, blocked, 'thud')
      } else {
        if (blockedbyplayer && board?.restartonzap) {
          playerwaszapped(book, board, blocked, blocked.id ?? '')
        }
        memorysendtoelement(blocked, element, 'thud')
        memorysendtoelement(element, blocked, 'shot')
      }
    } else {
      if (blockedbyplayer) {
        memorysendtoelement(blocked, element, 'touch')
        memorysendtoelement(element, blocked, 'touch')
      } else if (blockedisbullet) {
        memorysendtoelement(blocked, element, 'shot')
        memorysendtoelement(element, blocked, 'thud')
      } else {
        memorysendtoelement(blocked, element, 'thud')
        memorysendtoelement(element, blocked, 'bump')
      }
    }

    // blocked
    return false
  }

  // we are allowed to move!
  return true
}

export function createboardelement() {
  const boardelement: BOARD_ELEMENT = {
    id: createsid(),
  }
  return boardelement
}

enum BOARD_ELEMENT_KEYS {
  kind,
  id,
  x,
  y,
  lx,
  ly,
  code,
  name,
  char,
  color,
  bg,
  light,
  player,
  bucket,
  pushable,
  collision,
  breakable,
  tickertext,
  tickertime,
  p1,
  p2,
  p3,
  cycle,
  stepx,
  stepy,
  sender,
  arg,
  stopped,
  removed,
  party,
  group,
  lightdir,
  item,
  p4,
  p5,
  p6,
  displaychar,
  displaycolor,
  displaybg,
  shootx,
  shooty,
  p7,
  p8,
  p9,
  p10,
}

// safe to serialize copy of boardelement
export function boardelementexport(
  boardelement: MAYBE<BOARD_ELEMENT>,
): MAYBE<FORMAT_OBJECT> {
  if (ispresent(boardelement?.id)) {
    return formatobject(boardelement, BOARD_ELEMENT_KEYS, {
      category: FORMAT_SKIP,
      kinddata: FORMAT_SKIP,
      stopped: FORMAT_SKIP,
      removed: FORMAT_SKIP,
      bucket: FORMAT_SKIP,
    })
  }
  // terrain
  return formatobject(boardelement, BOARD_ELEMENT_KEYS, {
    id: FORMAT_SKIP,
    x: FORMAT_SKIP,
    y: FORMAT_SKIP,
    lx: FORMAT_SKIP,
    ly: FORMAT_SKIP,
    code: FORMAT_SKIP,
    category: FORMAT_SKIP,
    kinddata: FORMAT_SKIP,
    stopped: FORMAT_SKIP,
    removed: FORMAT_SKIP,
    bucket: FORMAT_SKIP,
  })
}

// import json into boardelement
export function boardelementimport(
  boardelemententry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD_ELEMENT> {
  return unformatobject(boardelemententry, BOARD_ELEMENT_KEYS)
}

export function boardelementisobject(element: MAYBE<BOARD_ELEMENT>): boolean {
  return element?.category === CATEGORY.ISOBJECT
}

export function boardelementapplycolor(
  element: MAYBE<BOARD_ELEMENT>,
  strcolor: MAYBE<STR_COLOR>,
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

// From boardlookup.ts

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
      !ispresent(object.removed)
    ) {
      // add category
      object.category = CATEGORY.ISOBJECT

      // update lookup
      if (memoryelementstatread(object, 'collision') !== COLLISION.ISGHOST) {
        lookup[object.x + object.y * BOARD_WIDTH] = object.id
      }

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
