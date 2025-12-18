import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { COLLISION, PT } from 'zss/words/types'

import { boardcheckcollide } from './atomics'
import { boarddeleteobject, boardelementindex, boardobjectread } from './board'
import { boardelementisobject } from './boardelement'
import { bookelementdisplayread } from './book'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_ELEMENT_STAT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  CODE_PAGE_TYPE,
} from './types'

import { memoryelementkindread, memoryelementstatread } from '.'

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
      // players do not block layers
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
  return ispresent(boardcheckblockedobject(board, collsion, dest))
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
