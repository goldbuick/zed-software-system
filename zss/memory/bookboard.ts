import { pttoindex } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { ispid } from 'zss/mapping/guid'
import { clamp, randominteger } from 'zss/mapping/number'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import {
  dirfrompts,
  ispt,
  mapstrdirtoconst,
  ptapplydir,
  STR_DIR,
} from 'zss/words/dir'
import { STR_KIND } from 'zss/words/kind'
import { CATEGORY, COLLISION, DIR, NAME, PT } from 'zss/words/types'

import { checkdoescollide, findplayerforelement } from './atomics'
import {
  boarddeleteobject,
  boardelementindex,
  boardfindplayer,
  boardobjectcreatefromkind,
  boardobjectread,
  boardobjectreadbypt,
  boardsetterrain,
  boardterrainsetfromkind,
} from './board'
import { boardelementapplycolor, boardelementname } from './boardelement'
import {
  bookelementgroupread,
  bookelementkindread,
  bookelementstatread,
  bookreadobject,
  bookreadterrain,
} from './book'
import { bookboardreadpath } from './bookboardpathing'
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

// quick lookup utils

export function bookboardsetlookup(book: MAYBE<BOOK>, board: MAYBE<BOARD>) {
  // invalid data
  if (!ispresent(book) || !ispresent(board)) {
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
      lookup[object.x + object.y * BOARD_WIDTH] = object.id

      // update named lookup
      const name = NAME(object.name ?? object.kinddata?.name ?? '')
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(object.id)
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
      const name = boardelementname(terrain)
      if (!named[name]) {
        named[name] = new Set<string>()
      }
      named[name].add(i)
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

export function bookboardresetlookups(book: MAYBE<BOOK>, board: MAYBE<BOARD>) {
  if (!ispresent(board)) {
    return
  }

  // reset all lookups
  delete board.named
  delete board.lookup

  // make sure lookup is created
  bookboardsetlookup(book, board)
}

export function bookboardnamedwrite(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  index?: number,
) {
  // invalid data
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.named) ||
    !ispresent(element)
  ) {
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

export function bookboardobjectlookupwrite(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  // invalid data
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.lookup) ||
    !ispresent(object?.id)
  ) {
    return
  }
  // update object lookup
  if (!ispresent(object.removed)) {
    const x = object.x ?? 0
    const y = object.y ?? 0
    board.lookup[x + y * BOARD_WIDTH] = object.id
  }
}

export function bookboardterrainnameddelete(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  terrain: MAYBE<BOARD_ELEMENT>,
) {
  if (
    ispresent(book) &&
    ispresent(board) &&
    ispresent(terrain?.x) &&
    ispresent(terrain.y)
  ) {
    // remove from named
    const name = boardelementname(terrain)
    const index = boardelementindex(board, terrain)
    if (ispresent(board.named?.[name])) {
      board.named[name].delete(index)
    }
  }
}

export function bookboardobjectnamedlookupdelete(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  object: MAYBE<BOARD_ELEMENT>,
) {
  if (ispresent(book) && ispresent(board) && ispresent(object?.id)) {
    // remove from lookup
    if (ispresent(board.lookup) && ispresent(object.x) && ispresent(object.y)) {
      const index = object.x + object.y * BOARD_WIDTH
      if (board.lookup[index] === object.id) {
        board.lookup[index] = undefined
      }
    }
    // remove from named
    const name = boardelementname(object)
    if (ispresent(board.named?.[name]) && ispresent(object.id)) {
      board.named[name].delete(object.id)
    }
  }
}

// evals directions into a PT

export function boardevaldir(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  player: string,
  dir: STR_DIR,
  startpt: PT,
): PT {
  if (!ispresent(book) || !ispresent(board) || !ispresent(target)) {
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
        // need to skip args
        i += 2
        break
      }
      case DIR.TO:
      case DIR.AT: {
        // BY <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = clamp(x, 0, xmax)
          pt.y = clamp(y, 0, ymax)
        }
        // need to skip args
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
          book,
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
      // pathfinding
      case DIR.FLEE:
      case DIR.AWAY: {
        // AWAY <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          const dest = { x: clamp(x, 0, xmax), y: clamp(y, 0, ymax) }
          const collision = bookelementstatread(book, target, 'collision')
          const maybept = bookboardreadpath(
            book,
            board,
            collision,
            pt,
            dest,
            true,
          )
          if (ispresent(maybept)) {
            pt.x = maybept.x
            pt.y = maybept.y
          }
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.FIND:
      case DIR.TOWARD: {
        // TOWARD <x> <y>
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          const dest = { x: clamp(x, 0, xmax), y: clamp(y, 0, ymax) }
          if (randominteger(1, 100) < 5) {
            ptapplydir(pt, pick(DIR.NORTH, DIR.SOUTH, DIR.WEST, DIR.EAST))
          } else {
            const collision = bookelementstatread(book, target, 'collision')
            const maybept = bookboardreadpath(
              book,
              board,
              collision,
              pt,
              dest,
              false,
            )
            if (ispresent(maybept)) {
              // check dest spot for blocked
              if (
                maybept.x !== x &&
                maybept.y !== y &&
                boardobjectreadbypt(board, maybept)
              ) {
                switch (dirfrompts(startpt, maybept)) {
                  case DIR.EAST:
                  case DIR.WEST:
                    pt.y += pick(-1, 1)
                    break
                  case DIR.NORTH:
                  case DIR.SOUTH:
                    pt.x += pick(-1, 1)
                    break
                }
              } else {
                pt.x = maybept.x
                pt.y = maybept.y
              }
            }
          }
        }
        // need to skip args
        i += 2
        break
      }
      case DIR.PLAYER: {
        const maybeplayer = findplayerforelement(board, startpt, player)
        if (ispt(maybeplayer)) {
          pt.x = maybeplayer.x
          pt.y = maybeplayer.y
        }
        break
      }
    }
  }

  return pt
}

// object / terrain utils

export function bookboardwritebulletobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
) {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind
    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      // create new object element
      const object = boardobjectcreatefromkind(board, dest, name)
      // update color
      boardelementapplycolor(object, maybecolor)
      return object
    }
  }
  return undefined
}

export function bookboardwritefromkind(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  kind: MAYBE<STR_KIND>,
  dest: PT,
  id?: string,
): MAYBE<BOARD_ELEMENT> {
  if (ispresent(book) && ispresent(board) && ispresent(kind)) {
    const [name, maybecolor] = kind

    const maybeterrain = bookreadterrain(book, name)
    if (ispresent(maybeterrain)) {
      const terrain = boardterrainsetfromkind(board, dest, name)
      if (ispresent(terrain)) {
        boardelementapplycolor(terrain, maybecolor)
        // calc index
        const idx = pttoindex(dest, BOARD_WIDTH)
        // update named (terrain & objects)
        bookelementkindread(book, terrain)
        bookboardnamedwrite(book, board, terrain, idx)
        return terrain
      }
    }

    const maybeobject = bookreadobject(book, name)
    if (ispresent(maybeobject) && ispresent(maybeobject.name)) {
      const object = boardobjectcreatefromkind(board, dest, name, id)
      if (ispresent(object)) {
        boardelementapplycolor(object, maybecolor)
        // update lookup (only objects)
        bookboardobjectlookupwrite(book, board, object)
        // update named (terrain & objects)
        bookelementkindread(book, object)
        bookboardnamedwrite(book, board, object)
        return object
      }
    }
  }

  return undefined
}

export function bookboardsafedelete(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  timestamp: number,
) {
  if (!ispresent(element) || boardelementname(element) === 'player') {
    return false
  }

  if (element.id) {
    // mark for cleanup
    element.removed = timestamp
    // drop from luts
    bookboardobjectnamedlookupdelete(book, board, element)
  } else {
    boardsetterrain(board, {
      x: element?.x ?? 0,
      y: element?.y ?? 0,
    })
    // drop from luts
    bookboardterrainnameddelete(book, board, element)
  }

  return true
}

export function bookboardcheckblockedobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  collision: MAYBE<COLLISION>,
  dest: PT,
): boolean {
  // first pass clipping
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(board.lookup) ||
    dest.x < 0 ||
    dest.x >= BOARD_WIDTH ||
    dest.y < 0 ||
    dest.y >= BOARD_HEIGHT
  ) {
    return true
  }

  // gather meta for move
  const targetidx = dest.x + dest.y * BOARD_WIDTH

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[targetidx] ?? '404')
  if (ispresent(maybeobject)) {
    // for sending interaction messages
    return true
  }

  // blocked by terrain
  const mayberterrain = board.terrain[targetidx]
  if (ispresent(mayberterrain)) {
    const terrainkind = bookelementkindread(book, mayberterrain)
    const terraincollision = mayberterrain.collision ?? terrainkind?.collision
    return checkdoescollide(collision, terraincollision)
  }

  return false
}

export function bookboardcheckmoveobject(
  book: MAYBE<BOOK>,
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
  const collsion = bookelementstatread(book, object, 'collision')
  return bookboardcheckblockedobject(book, board, collsion, dest)
}

export function bookboardmoveobject(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  movingelement: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): MAYBE<BOARD_ELEMENT> {
  const target = boardobjectread(board, movingelement?.id ?? '')

  // first pass clipping
  if (
    !ispresent(book) ||
    !ispresent(board) ||
    !ispresent(target) ||
    !ispresent(target.x) ||
    !ispresent(target.y) ||
    !ispresent(board.lookup) ||
    !ispresent(movingelement) ||
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
  if (target.x - dest.x === 0 && target.y - dest.y === 0) {
    // no interaction due to no movement
    return undefined
  }

  // gather meta for move
  const startidx = boardelementindex(board, target)
  const targetidx = boardelementindex(board, dest)
  const targetcollision =
    bookelementstatread(book, target, 'collision') ?? COLLISION.ISWALK
  const targetisplayer = ispid(target?.id)

  // blocked by an object
  const maybeobject = boardobjectread(board, board.lookup[targetidx] ?? '')
  const maybeobjectisplayer = ispid(maybeobject?.id ?? '')
  if (
    // we are blocked by an object
    ispresent(maybeobject) &&
    // and we are both NOT players
    (!targetisplayer || !maybeobjectisplayer) &&
    // AND have different groups
    bookelementgroupread(book, movingelement) !==
      bookelementgroupread(book, maybeobject)
  ) {
    // is element pushable ?
    const ispushable = !!bookelementstatread(book, maybeobject, 'pushable')
    if (ispushable) {
      // is recursive move a good idae ??
      const bump: PT = {
        x: dest.x - (movingelement.x ?? 0),
        y: dest.y - (movingelement.y ?? 0),
      }
      bookboardmoveobject(book, board, maybeobject, bump)
    }

    // for sending interaction messages
    return { ...maybeobject }
  }

  // blocked by terrain
  const mayberterrain = board.terrain[targetidx]
  if (ispresent(mayberterrain)) {
    const terraincollision =
      mayberterrain.collision ??
      mayberterrain?.kinddata?.collision ??
      COLLISION.ISWALK
    if (checkdoescollide(targetcollision, terraincollision)) {
      // for sending interaction messages
      return { ...mayberterrain, x: dest.x, y: dest.y }
    }
  }

  // update object location
  target.x = dest.x
  target.y = dest.y

  // if not removed, update lookup
  if (!ispresent(target.removed)) {
    // blank current lookup
    board.lookup[startidx] = undefined
    // update lookup at dest
    board.lookup[targetidx] = target.id ?? ''
  }

  // no interaction
  return undefined
}

function bookboardcleanup(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  timestamp: number,
) {
  const ids: string[] = []
  if (!ispresent(book) || !ispresent(board)) {
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

export function bookboardtick(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  timestamp: number,
) {
  const args: BOOK_RUN_ARGS[] = []

  if (!ispresent(book) || !ispresent(board)) {
    return args
  }

  // force build object lookup pre-tick
  board.lookup = undefined
  bookboardsetlookup(book, board)

  // iterate through objects
  const objects = Object.values(board.objects)
  for (let i = 0; i < objects.length; ++i) {
    const object = objects[i]

    // check that we have an id
    if (!ispresent(object.id)) {
      continue
    }

    // track last position
    object.lx = object.x
    object.ly = object.y

    // lookup kind
    const kind = bookelementkindread(book, object)

    // object code is composed of kind code + object code
    const code = `${kind?.code ?? ''}\n${object.code ?? ''}`

    // check that we have code to execute
    if (!code) {
      continue
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

  // cleanup objects flagged for deletion
  const stopids = bookboardcleanup(book, board, timestamp)
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

export function bookboardreadgroup(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
  targetgroup: string,
) {
  const objectelements: BOARD_ELEMENT[] = []
  const terrainelements: BOARD_ELEMENT[] = []
  if (!ispresent(book) || !ispresent(board)) {
    return { objectelements, terrainelements }
  }

  // read target group
  const allobjectelements = Object.values(board.objects)
  for (let i = 0; i < allobjectelements.length; ++i) {
    const el = allobjectelements[i]
    const stat = bookelementstatread(
      book,
      el,
      targetgroup as BOARD_ELEMENT_STAT,
    )
    const group = bookelementgroupread(book, el)
    if (ispresent(stat) || group === targetgroup) {
      objectelements.push(el)
    }
  }
  for (let i = 0; i < BOARD_SIZE; ++i) {
    const el = board.terrain[i]
    if (ispresent(el)) {
      const stat = bookelementstatread(
        book,
        el,
        targetgroup as BOARD_ELEMENT_STAT,
      )
      const group = bookelementgroupread(book, el)
      if (ispresent(stat) || group === targetgroup) {
        terrainelements.push(el)
      }
    }
  }

  return { objectelements, terrainelements }
}
