import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { dirfrompts, ptapplydir } from 'zss/words/dir'
import { COLLISION, PT } from 'zss/words/types'

import { memoryboardelementisobject } from './boardelement'
import {
  memoryboardelementindex,
  memorydeleteboardobject,
  memoryplayerblockedbyedge,
  memoryplayerwaszapped,
  memoryreadobject,
  memoryreadterrain,
} from './boardoperations'
import { memorysendtoelement } from './gamesend'
import { memorycheckcollision } from './spatialqueries'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOOK,
  CODE_PAGE_TYPE,
} from './types'

import { memorycheckelementpushable, memoryreadelementstat } from '.'

export function memorycheckblockedboardobject(
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
  const maybeobject = memoryreadobject(board, board.lookup[targetidx] ?? '404')
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
    memorycheckcollision(
      collision,
      memoryreadelementstat(maybeterrain, 'collision'),
    )
  ) {
    return maybeterrain
  }

  // no interaction
  return undefined
}

export function memorycheckmoveboardobject(
  board: MAYBE<BOARD>,
  target: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): boolean {
  const object = memoryreadobject(board, target?.id ?? '')
  const objectx = object?.x ?? -1
  const objecty = object?.y ?? -1
  // first pass, are we actually trying to move ?
  if (objectx - dest.x === 0 && objecty - dest.y === 0) {
    // no interaction due to no movement
    return true
  }
  const collsion = memoryreadelementstat(object, 'collision')
  const blockedby = memorycheckblockedboardobject(board, collsion, dest)
  return ispresent(blockedby)
}

export function memorycleanupboard(board: MAYBE<BOARD>, timestamp: number) {
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
        memorydeleteboardobject(board, target.id)
      }
    }
  }
  return ids
}

export function memorymoveboardobject(
  board: MAYBE<BOARD>,
  elementtomove: MAYBE<BOARD_ELEMENT>,
  dest: PT,
): MAYBE<BOARD_ELEMENT> {
  const movingelement = memoryreadobject(board, elementtomove?.id ?? '')

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
  const startidx = memoryboardelementindex(board, movingelement)
  const destidx = memoryboardelementindex(board, dest)
  const movingelementcollision = memoryreadelementstat(
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
  const maybeobject = memoryreadobject(board, board.lookup[destidx] ?? '')
  if (memoryreadelementstat(maybeobject, 'collision') === COLLISION.ISGHOST) {
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
  const terraincollision = memoryreadelementstat(mayberterrain, 'collision')

  // if blocked by terrain, bail
  if (memorycheckcollision(movingelementcollision, terraincollision)) {
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

  let blocked = memorymoveboardobject(board, element, dest)
  const elementcollision = memoryreadelementstat(element, 'collision')
  const elementisplayer = ispid(element.id)
  const elementisbullet = elementcollision === COLLISION.ISBULLET

  // bullets can't PUSH, and you can only push object elements
  if (
    elementcollision !== COLLISION.ISBULLET &&
    ispresent(blocked) &&
    memoryboardelementisobject(blocked)
  ) {
    // check terrain __under__ blocked
    const mayberterrain = memoryreadterrain(
      board,
      blocked.x ?? -1,
      blocked.y ?? -1,
    )
    const terraincollision = memoryreadelementstat(mayberterrain, 'collision')
    if (!memorycheckcollision(elementcollision, terraincollision)) {
      const elementisplayer = ispid(element?.id)

      // is blocked pushable ?
      const isitem = !!memoryreadelementstat(blocked, 'item')
      const ispushable = memorycheckelementpushable(element, blocked)

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
      blocked = memorymoveboardobject(board, element, dest)
    }
  }

  if (ispresent(blocked)) {
    const blockedbyplayer = ispid(blocked.id)
    const blockedisbullet =
      memoryreadelementstat(blocked, 'collision') === COLLISION.ISBULLET
    const blockedisedge = blocked.kind === 'edge'
    if (elementisplayer) {
      if (blockedisedge) {
        if (!memoryplayerblockedbyedge(book, board, element, dest)) {
          memorysendtoelement(blocked, element, 'thud')
        }
      } else if (blockedisbullet) {
        if (board?.restartonzap) {
          memoryplayerwaszapped(book, board, element, element.id ?? '')
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
          memoryplayerwaszapped(book, board, blocked, blocked.id ?? '')
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
