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

  function maybeaddflagboundary(id: string) {
    const boundary = book?.flags[id]
    if (ispresent(boundary)) {
      out.add(boundary)
    }
  }

  // add board specific boundaries
  maybeaddflagboundary(createsynthid(board.id))
  maybeaddflagboundary(createlayersid(board.id))
  maybeaddflagboundary(createtrackingid(board.id))

  // scan objects for chip and player boundaries
  const ids = Object.keys(board.objects)
  for (const element of ids) {
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
