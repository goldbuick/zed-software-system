import { ispid } from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { COLLISION, PT } from 'zss/words/types'

import { memoryreadobject } from './boardaccess'
import { memoryreadelementstat } from './boards'
import { memorycheckcollision } from './spatialqueries'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

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
