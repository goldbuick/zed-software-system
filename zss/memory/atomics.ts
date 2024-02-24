import { PT } from 'zss/firmware/wordtypes'

import { BOARD, MAYBE_BOARD_ELEMENT } from './board'

// what is atomics? a set of spatial and data related queries

export function nearestpt(board: BOARD, pt: PT, items: MAYBE_BOARD_ELEMENT[]) {
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
