import { MAYBE, ispresent } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
  STR_KIND,
} from 'zss/words/kind'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

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

export function findplayerforelement(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
): MAYBE<BOARD_ELEMENT> {
  // check aggro
  const maybelplayer = board?.objects[player]
  if (ispresent(maybelplayer)) {
    return maybelplayer
  }
  // find nearest player to element
  if (ispresent(element)) {
    const players = listnamedelements(board, 'player')
    const pt = { x: element.x ?? 0, y: element.y ?? 0 }
    picknearestpt(pt, players)
  }
  // not found
  return undefined
}

export function listnamedelements(
  board: MAYBE<BOARD>,
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
  elements: MAYBE<BOARD_ELEMENT>[],
  kind: STR_KIND,
): BOARD_ELEMENT[] {
  const name = readstrkindname(kind)
  const color = readstrkindcolor(kind)
  const bg = readstrkindbg(kind)
  return elements
    .filter((element) => {
      if (ispresent(name)) {
        const elementname = NAME(element?.name ?? element?.kinddata?.name ?? '')
        if (elementname !== name) {
          return false
        }
      }
      if (ispresent(color)) {
        const elementcolor: COLOR =
          element?.color ?? element?.kinddata?.color ?? COLOR.WHITE
        if (elementcolor !== color) {
          return false
        }
      }
      if (ispresent(bg)) {
        const elementbg: COLOR =
          element?.bg ?? element?.kinddata?.bg ?? COLOR.BLACK
        if (elementbg !== bg) {
          return false
        }
      }
      return true
    })
    .filter(ispresent)
}

export function listelementsbyattr(
  board: MAYBE<BOARD>,
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
        const maybebyname = listnamedelements(board, NAME(idnameorpt))
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

export function picknearestpt(pt: PT, items: MAYBE<BOARD_ELEMENT>[]) {
  let ndist = 0
  let nearest: MAYBE<BOARD_ELEMENT>

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

export function pickfarthestpt(pt: PT, items: MAYBE<BOARD_ELEMENT>[]) {
  let ndist = 0
  let nearest: MAYBE<BOARD_ELEMENT>

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
