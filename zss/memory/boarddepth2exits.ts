import { memoryreadboardbyaddress } from './boards'
import type { BOARD } from './types'

function boardidfromaddr(addr: string): string {
  return memoryreadboardbyaddress(addr ?? '')?.id ?? ''
}

function depth2along(
  board: BOARD,
  first: 'exitnorth' | 'exitsouth' | 'exitwest' | 'exiteast',
): string {
  const mid = memoryreadboardbyaddress(board[first] ?? '')
  if (!mid) {
    return ''
  }
  return boardidfromaddr(mid[first] ?? '')
}

/** Cardinal depth-2 exit board ids (east-of-east, etc.) for travel-biased previews. */
export function memorydepth2exitboardids(board: BOARD): {
  exiteast2: string
  exitwest2: string
  exitnorth2: string
  exitsouth2: string
} {
  return {
    exiteast2: depth2along(board, 'exiteast'),
    exitwest2: depth2along(board, 'exitwest'),
    exitnorth2: depth2along(board, 'exitnorth'),
    exitsouth2: depth2along(board, 'exitsouth'),
  }
}
