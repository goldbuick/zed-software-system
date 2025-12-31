import {
  FORMAT_OBJECT,
  FORMAT_SKIP,
  formatobject,
  unformatobject,
} from 'zss/feature/format'
import { indextopt, ptdist, ptwithin } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { createsid, ispid } from 'zss/mapping/guid'
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
import { COLLISION, DIR, PT } from 'zss/words/types'

import {
  memoryboardelementisobject,
  memoryexportboardelement,
  memoryimportboardelement,
} from './boardelement'
import {
  memorydeleteboardobjectnamedlookup,
  memorydeleteboardterrainnamed,
} from './boardlookup'
import {
  BOOK_RUN_ARGS,
  memorycleanupboard,
  memorymoveboardobject,
} from './boardmovement'
import { memoryreadbookflag, memoryreadelementdisplay } from './bookoperations'
import { memorymoveplayertoboard } from './playermanagement'
import {
  memorylistboardnamedelements,
  memorypickboardnearestpt,
  memoryreadboardpath,
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
  memorypickcodepagewithtype,
  memoryreadboard,
  memoryreadelementkind,
  memoryreadelementstat,
} from '.'

// From board.ts

function createempty() {
  return new Array(BOARD_WIDTH * BOARD_HEIGHT).map(() => undefined)
}

export function memorydeleteboardobject(board: MAYBE<BOARD>, id: string) {
  if (ispresent(board?.objects[id])) {
    delete board.objects[id]
    return true
  }
  return false
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

export function memoryreadelement(
  board: MAYBE<BOARD>,
  pt: PT,
): MAYBE<BOARD_ELEMENT> {
  // clipping
  const index = memoryboardelementindex(board, pt)
  if (index < 0 || !ispresent(board?.lookup)) {
    return undefined
  }

  // check lookup
  const object = memoryreadobject(board, board.lookup[index] ?? '')
  if (ispresent(object)) {
    return object
  }

  // return terrain
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

export function memoryevaldir(
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
        const playerobject = memoryfindboardplayer(board, element, player)
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
        const modeval = memoryevaldir(
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
            const collision = memoryreadelementstat(element, 'collision')
            const maybept = memoryreadboardpath(
              board,
              collision,
              pt,
              dest,
              true,
            )
            // check dest spot for blocked
            if (ispresent(maybept) && (maybept.x !== x || maybept.y !== y)) {
              const step = memoryreadobjectbypt(board, maybept)
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
            const collision = memoryreadelementstat(element, 'collision')
            const maybept = memoryreadboardpath(
              board,
              collision,
              pt,
              dest,
              false,
            )
            // check dest spot for blocked
            if (ispresent(maybept) && (maybept.x !== x || maybept.y !== y)) {
              const step = memoryreadobjectbypt(board, maybept)
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
        const modeval = memoryevaldir(
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
        const modeval = memoryevaldir(
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
              if (memoryptwithinboard(pt)) {
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
        const modeval = memoryevaldir(
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
              if (memoryptwithinboard(pt)) {
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
        const modeval = memoryevaldir(
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
          if (!memoryptwithinboard(pt)) {
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

export function memoryexportboard(board: MAYBE<BOARD>): MAYBE<FORMAT_OBJECT> {
  return formatobject(board, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(memoryexportboardelement),
    objects: (objects) =>
      Object.values<BOARD_ELEMENT>(objects)
        .filter((boardelement) => !boardelement.removed)
        .map(memoryexportboardelement),
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

export function memoryfindboardplayer(
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
  return memorypickboardnearestpt(
    target,
    memorylistboardnamedelements(board, 'player'),
  )
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

export function memoryimportboard(
  boardentry: MAYBE<FORMAT_OBJECT>,
): MAYBE<BOARD> {
  return unformatobject(boardentry, BOARD_KEYS, {
    terrain: (terrain) => terrain.map(memoryimportboardelement),
    objects: (elements) => {
      const objects: Record<string, BOARD_ELEMENT> = {}
      for (let i = 0; i < elements.length; ++i) {
        const obj = memoryimportboardelement(elements[i])
        if (ispresent(obj?.id)) {
          objects[obj.id] = obj
        }
      }
      return objects
    },
  })
}

export function memorycreateboardobject(
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

export function memorycreateboardobjectfromkind(
  board: MAYBE<BOARD>,
  pt: PT,
  kind: string,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  return memorycreateboardobject(board, { ...pt, kind, id })
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
  // clipping
  const index = memoryboardelementindex(board, pt)
  if (index < 0 || !ispresent(board?.lookup)) {
    return undefined
  }

  // check lookup
  const object = memoryreadobject(board, board.lookup[index] ?? '')
  if (ispresent(object)) {
    return object
  }

  return undefined
}

export function memoryreadobjects(board: MAYBE<BOARD>): BOARD_ELEMENT[] {
  if (!ispresent(board)) {
    return []
  }
  return [...Object.values(board.objects)]
}

export function memoryreadgroup(
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
    const statnamed = memoryreadelementstat(
      el,
      targetgroup as BOARD_ELEMENT_STAT,
    )

    return (
      ispresent(statnamed) ||
      memoryreadelementdisplay(el).name === targetgroup ||
      memoryreadelementstat(el, 'group') === targetgroup
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
      if (ispresent(maybeobject) && memoryboardelementisobject(maybeobject)) {
        objectelements.push(maybeobject)
      }
    } else if (
      memoryboardelementisobject(maybeobject) &&
      checkelement(maybeobject, false)
    ) {
      objectelements.push(maybeobject)
    }
  }

  return { objectelements, terrainelements }
}

export function memorysafedeleteelement(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  timestamp: number,
) {
  if (
    !ispresent(element) ||
    memoryreadelementdisplay(element).name === 'player'
  ) {
    return false
  }

  if (element.id) {
    // mark for cleanup
    element.removed = timestamp
    // drop from luts
    memorydeleteboardobjectnamedlookup(board, element)
  } else {
    memorywriteterrain(board, {
      x: element?.x ?? 0,
      y: element?.y ?? 0,
    })
    // drop from luts
    memorydeleteboardterrainnamed(board, element)
  }

  return true
}

export function memorywriteterrain(
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

export function memorywriteterrainfromkind(
  board: MAYBE<BOARD>,
  pt: PT,
  kind: string,
): MAYBE<BOARD_ELEMENT> {
  return memorywriteterrain(board, { ...pt, kind })
}

export function memorytickboard(board: MAYBE<BOARD>, timestamp: number) {
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
      const kind = memoryreadelementkind(object)

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
        const cycle = memoryreadelementstat(object, 'cycle')
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
      switch (memoryreadelementstat(el, 'collision')) {
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
  const stopids = memorycleanupboard(board, timestamp)
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

export function memoryupdateboardvisuals(board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // see if we have an over board
  if (isstring(board.over)) {
    if (isstring(board.overboard)) {
      // validate cached resolve is still valid
      const over = memoryreadboard(board.overboard)
      if (!ispresent(over)) {
        delete board.overboard
      }
    } else {
      // check to see if board.over is a stat
      const maybeboard = memoryreadboard(board.over)
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
      const under = memoryreadboard(board.underboard)
      if (!ispresent(under)) {
        delete board.underboard
      }
    } else {
      // check to see if board.under is a stat
      const maybeboard = memoryreadboard(board.under)
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

export function memorycreateboard(fn = noop<BOARD>) {
  const board: BOARD = {
    terrain: createempty(),
    objects: {},
    // runtime
    id: '',
    name: '',
  }
  return fn(board)
}

export function memoryplayerblockedbyedge(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: BOARD_ELEMENT,
  dest: PT,
) {
  const elementid = element.id ?? ''
  // attempt to move player
  if (dest.x < 0) {
    // exit west
    const destboard = memoryreadboard(board?.exitwest ?? '')
    if (ispresent(destboard)) {
      return memorymoveplayertoboard(book, elementid, destboard.id, {
        x: BOARD_WIDTH - 1,
        y: dest.y,
      })
    }
  } else if (dest.x >= BOARD_WIDTH) {
    // exit east
    const destboard = memoryreadboard(board?.exiteast ?? '')
    if (ispresent(destboard)) {
      return memorymoveplayertoboard(book, elementid, destboard.id, {
        x: 0,
        y: dest.y,
      })
    }
  } else if (dest.y < 0) {
    // exit north
    const destboard = memoryreadboard(board?.exitnorth ?? '')
    if (ispresent(destboard)) {
      return memorymoveplayertoboard(book, elementid, destboard.id, {
        x: dest.x,
        y: BOARD_HEIGHT - 1,
      })
    }
  } else if (dest.y >= BOARD_HEIGHT) {
    // exit south
    const destboard = memoryreadboard(board?.exitsouth ?? '')
    if (ispresent(destboard)) {
      return memorymoveplayertoboard(book, elementid, destboard.id, {
        x: dest.x,
        y: 0,
      })
    }
  }
  return false
}

export function memoryplayerwaszapped(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
) {
  const enterx = memoryreadbookflag(book, player, 'enterx')
  const entery = memoryreadbookflag(book, player, 'entery')
  if (isnumber(enterx) && isnumber(entery) && ispresent(element)) {
    memorymoveboardobject(board, element, { x: enterx, y: entery })
  }
}

export function memoryptwithinboard(pt: PT) {
  return ptwithin(pt.x, pt.y, 0, BOARD_WIDTH - 1, BOARD_HEIGHT - 1, 0)
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
