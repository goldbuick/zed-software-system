import {
  PT,
  STR_KIND,
  ispt,
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
} from 'zss/firmware/wordtypes'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  MAYBE_BOARD,
  boardelementbg,
  boardelementcolor,
  boardelementname,
} from './board'
import { BOARD_ELEMENT, COLLISION, MAYBE_BOARD_ELEMENT } from './boardelement'

// what is atomics? a set of spatial and data related queries
// naming convention
// check does one to many comparisons, input can be anything
// list returns a list, input can be anything
// pick returns a single item FROM a list

export function checkcollision(
  maybesource: MAYBE<COLLISION>,
  maybedest: MAYBE<COLLISION>,
) {
  const source = maybesource ?? COLLISION.ISWALK
  const dest = maybedest ?? COLLISION.ISWALK
  switch (source) {
    case COLLISION.ISWALK:
      return dest !== COLLISION.ISWALK
    case COLLISION.ISSWIM:
      return dest !== COLLISION.ISSWIM
    case COLLISION.ISSOLID:
      return true // solid runs into everything
    case COLLISION.ISBULLET:
      return dest !== COLLISION.ISWALK && dest !== COLLISION.ISSWIM
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (ispresent(color) && boardelementcolor(element) !== color) {
        // console.info('no match on color', color)
        return false
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
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
        idnameorpt.x < BOARD_WIDTH &&
        idnameorpt.y >= 0 &&
        idnameorpt.y < BOARD_HEIGHT
      ) {
        const idx = idnameorpt.x + idnameorpt.y * BOARD_WIDTH
        const maybeid = board.lookup?.[idx]
        // check lookup first, then fallback to terrain
        return ispresent(maybeid) ? board.objects[maybeid] : board.terrain[idx]
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
