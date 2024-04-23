import {
  COLLISION,
  PT,
  STR_KIND,
  readkindbg,
  readkindcolor,
  readkindname,
} from 'zss/firmware/wordtypes'
import { ispresent } from 'zss/mapping/types'

import {
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

export function checkcollision(source: COLLISION, dest: COLLISION) {
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

export function listnamedelements(board: MAYBE_BOARD, name: string) {
  const elements = [...(board?.named?.[name]?.values() ?? [])]
  return elements.map((idorindex) => {
    if (typeof idorindex === 'string') {
      return board?.objects[idorindex]
    }
    return board?.terrain[idorindex]
  })
}

export function listelementsbykind(
  elements: MAYBE_BOARD_ELEMENT[],
  kind: STR_KIND,
): MAYBE_BOARD_ELEMENT[] {
  const name = readkindname(kind)
  const color = readkindcolor(kind)
  const bg = readkindbg(kind)
  return elements.filter((element) => {
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
