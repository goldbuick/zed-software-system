import { indextopt } from 'zss/mapping/2d'
import { pick } from 'zss/mapping/array'
import { randominteger } from 'zss/mapping/number'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { ispt } from 'zss/words/dir'
import {
  readstrkindbg,
  readstrkindcolor,
  readstrkindname,
  STR_KIND,
} from 'zss/words/kind'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import { boardelementread } from './board'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
} from './types'

// what is atomics? a set of spatial, data related queries, and mods
// naming convention
// check does one to many comparisons, input can be anything
// list returns a list, input can be anything
// pick returns a single item FROM a list

export function checkdoescollide(
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
  elementpt: MAYBE<PT>,
  player: string,
): MAYBE<BOARD_ELEMENT> {
  // check aggro
  const maybelplayer = board?.objects[player]
  if (ispresent(maybelplayer)) {
    return maybelplayer
  }

  const players = listnamedelements(board, 'player')
  // find nearest player to element
  if (ispresent(elementpt)) {
    if (elementpt.x < 0) {
      elementpt.x = randominteger(0, BOARD_WIDTH - 1)
    }
    if (elementpt.y < 0) {
      elementpt.y = randominteger(0, BOARD_HEIGHT - 1)
    }
    return picknearestpt(elementpt, players)
  }

  // return rand
  return pick(...players)
}

export function listelementsbyempty(board: MAYBE<BOARD>): PT[] {
  const pts: PT[] = []
  // returns a list of points where empties are
  for (let i = 0; i < BOARD_SIZE; ++i) {
    const el = boardelementread(board, indextopt(i, BOARD_WIDTH))
    if (!el?.kind && !el?.name) {
      pts.push({ x: el?.x ?? 0, y: el?.y ?? 0 })
    }
  }
  return pts
}

export function listnamedelements(
  board: MAYBE<BOARD>,
  name: string,
): BOARD_ELEMENT[] {
  const named = [...(board?.named?.[name]?.values() ?? [])]
  return named
    .map((idorindex) => {
      if (typeof idorindex === 'string') {
        return board?.objects[idorindex]
      }
      return board?.terrain[idorindex]
    })
    .filter(ispresent)
}

export function listptsbyempty(board: MAYBE<BOARD>): PT[] {
  const pts: PT[] = []
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    for (let x = 0; x < BOARD_WIDTH; ++x) {
      const pt = { x, y }
      const el = boardelementread(board, pt)
      if (!el?.name && !el?.kind) {
        pts.push(pt)
      }
    }
  }
  return pts
}

export function listelementsbykind(
  board: MAYBE<BOARD>,
  kind: STR_KIND,
): BOARD_ELEMENT[] {
  const name = readstrkindname(kind)
  const color = readstrkindcolor(kind)
  const bg = readstrkindbg(kind)
  return listnamedelements(board, name ?? '')
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

export function listelementsbyidnameorpts(
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
