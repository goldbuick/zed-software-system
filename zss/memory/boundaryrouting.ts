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

function maybeaddflagboundary(book: MAYBE<BOOK>, id: string, out: Set<string>) {
  const boundary = book?.flags[id]
  if (ispresent(boundary)) {
    out.add(boundary)
  }
}

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

  // add board specific boundaries
  maybeaddflagboundary(book, createsynthid(board.id), out)
  maybeaddflagboundary(book, createlayersid(board.id), out)
  maybeaddflagboundary(book, createtrackingid(board.id), out)

  // scan objects for chip and player boundaries
  const objects = Object.values(board.objects)
  for (const element of objects) {
    // skip if removed or no id is set
    if (!element.id || element.removed) {
      continue
    }
    // add chip boundary if present
    maybeaddflagboundary(book, createchipid(element.id), out)
    // add player and gadget boundaries if present
    if (ispid(element.id)) {
      maybeaddflagboundary(book, element.id, out)
      maybeaddflagboundary(book, creategadgetid(element.id), out)
    }
  }

  return Array.from(out)
}

export function memorycollectboundaryidsforboardchips(
  book: MAYBE<BOOK>,
  board: MAYBE<BOARD>,
): string[] {
  if (!ispresent(board)) {
    return []
  }

  // scan objects for chip  boundaries
  const out = new Set<string>()
  const objects = Object.values(board.objects)
  for (const element of objects) {
    // skip if removed or no id is set
    if (!element.id || element.removed) {
      continue
    }
    // add chip boundary
    const id = createchipid(element.id)
    const boundary = book?.flags[id]
    if (ispresent(boundary)) {
      out.add(id)
    }
  }

  return Array.from(out)
}
