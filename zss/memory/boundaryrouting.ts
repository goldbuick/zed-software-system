import {
  creategadgetid,
  createlayersid,
  createsynthid,
  createtrackingid,
  ispid,
} from 'zss/mapping/guid'
import { MAYBE, ispresent } from 'zss/mapping/types'

import { memoryreadplayersonboard } from './boardaccess'
import type { BOARD, BOOK } from './types'

/**
 * Boundary ids under `book.flags` tied to this board: synth/playqueue owner,
 * gadget layers cache, charset/palette pages, per-player flags + gadget when
 * those players are on the board, and optional `createtrackingid(board.id)` if
 * present (pick tracking otherwise uses stat addresses; see codepages).
 */
export function memorycollectboundaryidsforboard(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
): Set<string> {
  const out = new Set<string>()
  if (!ispresent(book) || !ispresent(board)) {
    return out
  }
  const mainbook = book

  function maybeaddflagboundary(ownerkey: string) {
    const bid = mainbook.flags[ownerkey]
    if (ispresent(bid)) {
      out.add(bid)
    }
  }

  maybeaddflagboundary(createsynthid(board.id))
  maybeaddflagboundary(createlayersid(board.id))
  maybeaddflagboundary(createtrackingid(board.id))

  const onplayers = memoryreadplayersonboard(board)
  for (let i = 0; i < onplayers.length; ++i) {
    const playerid = onplayers[i]
    if (ispid(playerid)) {
      maybeaddflagboundary(playerid)
      maybeaddflagboundary(creategadgetid(playerid))
    }
  }
  return out
}
