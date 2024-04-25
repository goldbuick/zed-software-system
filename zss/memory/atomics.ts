import {
  COLLISION,
  PT,
  STR_KIND,
  ispt,
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/firmware/wordtypes'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  BOARD_ELEMENT,
  MAYBE_BOARD,
  MAYBE_BOARD_ELEMENT,
  boardelementbg,
  boardelementcolor,
  boardelementname,
} from './board'

// what is atomics? a set of spatial and data related queries
// naming convention
// check does one to many comparisons, input can be anything
// list returns a list, input can be anything
// pick returns a single item FROM a list

export function checkcollision(
  maybesource: MAYBE<COLLISION>,
  maybedest: MAYBE<COLLISION>,
) {
  const source = maybesource ?? COLLISION.WALK
  const dest = maybedest ?? COLLISION.WALK
  switch (source) {
    case COLLISION.WALK:
      return dest !== COLLISION.WALK
    case COLLISION.SWIM:
      return dest !== COLLISION.SWIM
    case COLLISION.SOLID:
      return true // solid runs into everything
    case COLLISION.BULLET:
      return dest !== COLLISION.WALK && dest !== COLLISION.SWIM
  }
}

export function listnamedelements(
  board: MAYBE_BOARD,
  name: string,
): BOARD_ELEMENT[] {
  const elements = [...(board?.named?.[name]?.values() ?? [])]
  return elements
    .map((idorindex) => {
      if (typeof idorindex === 'string') {
        return board?.objects[idorindex]
      }
      return board?.terrain[idorindex]
    })
    .filter(ispresent)
}

export function listelementsbykind(
  elements: MAYBE_BOARD_ELEMENT[],
  kind: STR_KIND,
): BOARD_ELEMENT[] {
  const name = readstrkindname(kind)
  const color = readstrkindcolor(kind)
  const bg = readstrkindbg(kind)
  return elements
    .filter((element) => {
      if (ispresent(name) && boardelementname(element) !== name) {
        // console.info('no match on name', name)
        return false
      }
      if (ispresent(color) && boardelementcolor(element) !== color) {
        // console.info('no match on color', color)
        return false
      }
      if (ispresent(bg) && boardelementbg(element) !== bg) {
        // console.info('no match on bg', bg)
        return false
      }
      return true
    })
    .filter(ispresent)
}

export function listelementsbyattr(
  board: MAYBE_BOARD,
  idnameorpts: any[],
): BOARD_ELEMENT[] {
  if (!ispresent(board)) {
    return []
  }
  return idnameorpts
    .map((idnameorpt) => {
      if (typeof idnameorpt === 'string') {
        // check by id
        const maybebyid = board.objects[idnameorpt]
        if (ispresent(maybebyid)) {
          return maybebyid
        }
        // check by name
        const maybebyname = listnamedelements(board, idnameorpt.toLowerCase())
        if (maybebyname.length) {
          return maybebyname
        }
      } else if (
        // check by valid pt
        ispt(idnameorpt) &&
        idnameorpt.x >= 0 &&
        idnameorpt.x < board.width &&
        idnameorpt.y >= 0 &&
        idnameorpt.y < board.height
      ) {
        const idx = idnameorpt.x + idnameorpt.y * board.width
        const maybeid = board.lookup?.[idx]
        // check lookup first
        if (ispresent(maybeid)) {
          return board.objects[maybeid]
        }
        // then terrain
        return board.terrain[idx]
      }
      // no idea what you gave me
      return undefined
    })
    .flat()
    .filter(ispresent)
}

export function picknearestpt(pt: PT, items: MAYBE_BOARD_ELEMENT[]) {
  let ndist = 0
  let nearest: MAYBE_BOARD_ELEMENT

  for (let i = 0; i < items.length; ++i) {
    const item = items[i]
    if (item) {
      const ix = pt.x - (item.x ?? 0)
      const iy = pt.y - (item.y ?? 0)
      const idist = Math.sqrt(ix * ix + iy * iy)
      if (nearest === undefined || idist < ndist) {
        ndist = idist
        nearest = item
      }
    }
  }

  return nearest
}

export function pickfarthestpt(pt: PT, items: MAYBE_BOARD_ELEMENT[]) {
  let ndist = 0
  let nearest: MAYBE_BOARD_ELEMENT

  for (let i = 0; i < items.length; ++i) {
    const item = items[i]
    if (item) {
      const ix = pt.x - (item.x ?? 0)
      const iy = pt.y - (item.y ?? 0)
      const idist = Math.sqrt(ix * ix + iy * iy)
      if (nearest === undefined || idist > ndist) {
        ndist = idist
        nearest = item
      }
    }
  }

  return nearest
}
