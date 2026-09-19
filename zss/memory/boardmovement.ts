import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { dirfrompts, ptapplydir } from 'zss/words/dir'
import { COLLISION, PT } from 'zss/words/types'

import {
  READ_LAYER,
  memoryboardelementindex,
  memoryreadelement,
} from './boardaccess'
import { memoryboardelementisobject } from './boardelement'
import { memorydeleteboardobject } from './boardlifecycle'
import { memorycheckelementpushable, memoryreadelementstat } from './boards'
import {
  memoryplayerblockedbyedge,
  memoryplayerwaszapped,
} from './boardtransitions'
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

export function memorycheckblockedboardobject(
  board: MAYBE<BOARD>,
  collision: MAYBE<COLLISION>,
  dest: PT,
  isplayer = false,
): MAYBE<BOARD_ELEMENT> {
  // first pass clipping
  if (
    !ispresent(board) ||
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
  const maybeobject = memoryreadelement(board, dest, READ_LAYER.OBJECT)
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
  const object = memoryreadelement(board, target?.id ?? '', READ_LAYER.OBJECT)
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
  const movingelement = memoryreadelement(
    board,
    elementtomove?.id ?? '',
    READ_LAYER.OBJECT,
  )

  // first pass clipping
  if (
    !ispresent(board) ||
    !ispresent(movingelement) ||
    !ispresent(movingelement.x) ||
    !ispresent(movingelement.y) ||
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
  const maybeobject = memoryreadelement(board, dest, READ_LAYER.OBJECT)
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
  const elementtouched = blocked
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
    const mayberterrain = memoryreadelement(
      board,
      { x: blocked.x ?? -1, y: blocked.y ?? -1 },
      READ_LAYER.TERRAIN,
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
        // first lets push it !
        didpush[blockedid] = true
        const bumpdir = dirfrompts(
          { x: element.x ?? 0, y: element.y ?? 0 },
          dest,
        )
        const bump = ptapplydir(
          { x: blocked.x ?? 0, y: blocked.y ?? 0 },
          bumpdir,
        )
        // do the push !
        memorymoveobject(book, board, blocked, bump)

        // update blocked by element
        blocked = memorymoveboardobject(board, element, dest)
      }
    }
  }

  // handle touch
  if (ispresent(elementtouched)) {
    const elementtouchedisedge = elementtouched.kind === 'edge'
    const elementtouchedisplayer = ispid(elementtouched?.id ?? '')
    if (elementisplayer) {
      if (elementtouchedisedge) {
        memoryplayerblockedbyedge(board, element, dest)
      }
      // we now send our message to the other element
      memorysendtoelement(element, elementtouched, 'touch')
    } else if (elementisbullet) {
      if (elementtouchedisplayer && board?.restartonzap) {
        memoryplayerwaszapped(book, board, element, element.id ?? '')
      }
      // we now send our message to the other element
      memorysendtoelement(element, elementtouched, 'shot')
      // bullets thud on contact
      memorysendtoelement(elementtouched, element, 'thud')
    } else {
      // we now send our message to the other element
      memorysendtoelement(element, elementtouched, 'touch')
    }
  }

  // we are allowed to move!
  return ispresent(blocked) === false
}

type BOOK_RUN_CODE_TARGETS = {
  object: MAYBE<BOARD_ELEMENT>
  terrain: MAYBE<BOARD_ELEMENT>
}

type BOOK_RUN_CODE = {
  id: string
  code: string
  type: CODE_PAGE_TYPE
  pass?: 'tick' | 'draw'
  label?: string
}

export type BOOK_RUN_ARGS = BOOK_RUN_CODE_TARGETS & BOOK_RUN_CODE
