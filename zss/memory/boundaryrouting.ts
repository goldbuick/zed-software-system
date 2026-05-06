import {
  createchipid,
  creategadgetid,
  createlayersid,
  createsynthid,
  createtrackingid,
  ispid,
} from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import type { BOARD, BOOK } from './types'

export function memorycollectboundaryidsforboard(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
): string[] {
  if (!ispresent(board)) {
    return []
  }

  // include board id
  const out = new Set<string>()
  out.add(board.id)

  function maybeaddflagboundary(boundary: string) {
    const bid = book?.flags[boundary]
    if (ispresent(bid)) {
      out.add(bid)
    }
  }

  // add board specific boundaries
  maybeaddflagboundary(createsynthid(board.id))
  maybeaddflagboundary(createlayersid(board.id))
  maybeaddflagboundary(createtrackingid(board.id))

  // scan objects for chip and player boundaries
  const ids = Object.keys(board.objects)
  for (let i = 0; i < ids.length; ++i) {
    const element = ids[i]
    // add chip boundary
    maybeaddflagboundary(createchipid(element))
    // add player and gadget boundaries if present
    if (ispid(element)) {
      maybeaddflagboundary(element)
      maybeaddflagboundary(creategadgetid(element))
    }
  }

  return Array.from(out)
}
