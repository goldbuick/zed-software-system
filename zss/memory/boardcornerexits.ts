import { MAYBE, ispresent } from 'zss/mapping/types'

import { memoryreadboardbyaddressstable } from './boards'
import { type BOARD, CORNER_EXIT_DISPUTED } from './types'

type CardinalExit = 'exitnorth' | 'exitsouth' | 'exitwest' | 'exiteast'

function boardidfromaddr(addr: string): string {
  return memoryreadboardbyaddressstable(addr ?? '')?.id ?? ''
}

function cornerfrom(
  board: BOARD,
  first: CardinalExit,
  second: CardinalExit,
): string {
  const mid: MAYBE<BOARD> = memoryreadboardbyaddressstable(board[first] ?? '')
  if (!ispresent(mid)) {
    return ''
  }
  const secondaddr = mid[second]
  return boardidfromaddr(secondaddr ?? '')
}

function reconcilecorner(ida: string, idb: string): string {
  if (!ida && !idb) {
    return ''
  }
  if (ida && !idb) {
    return ida
  }
  if (!ida && idb) {
    return idb
  }
  if (ida === idb) {
    return ida
  }
  return CORNER_EXIT_DISPUTED
}

/** Resolved ids for diagonal previews via two-step cardinal traversal; disputed corners use CORNER_EXIT_DISPUTED. */
export function memorycornerexitboardids(board: BOARD): {
  exitne: string
  exitnw: string
  exitse: string
  exitsw: string
} {
  return {
    exitne: reconcilecorner(
      cornerfrom(board, 'exitnorth', 'exiteast'),
      cornerfrom(board, 'exiteast', 'exitnorth'),
    ),
    exitnw: reconcilecorner(
      cornerfrom(board, 'exitnorth', 'exitwest'),
      cornerfrom(board, 'exitwest', 'exitnorth'),
    ),
    exitse: reconcilecorner(
      cornerfrom(board, 'exitsouth', 'exiteast'),
      cornerfrom(board, 'exiteast', 'exitsouth'),
    ),
    exitsw: reconcilecorner(
      cornerfrom(board, 'exitsouth', 'exitwest'),
      cornerfrom(board, 'exitwest', 'exitsouth'),
    ),
  }
}
