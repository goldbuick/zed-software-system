import type { DEVICE } from 'zss/device'
import { boardrunnerowned } from 'zss/device/api'
import {
  memorysyncadmitboardrunner,
  memorysyncrevokeboardrunner,
} from 'zss/device/vm/memorysimsync'
import {
  ackboardrunners,
  boardrunners,
  skipboardrunners,
  tracking,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadplayersfromboard } from 'zss/memory/playermanagement'
import { memoryreadoperator } from 'zss/memory/session'

/** Clears elected runner state for a board; does not install a replacement. */
export function revokeboardrunnerassignment(vm: DEVICE, board: string): void {
  if (!isstring(board) || !board) {
    return
  }
  const runner = boardrunners[board]
  if (isstring(runner) && runner) {
    memorysyncrevokeboardrunner(runner, board)
    boardrunnerowned(vm, memoryreadoperator(), '')
    delete boardrunners[board]
    delete ackboardrunners[board]
    return
  }
  delete ackboardrunners[board]
}

/** Revokes every board this player is recorded as running; returns affected board ids. */
export function revokeboardrunnerassignmentsforplayer(
  vm: DEVICE,
  player: string,
): string[] {
  if (!isstring(player) || !player) {
    return []
  }
  const boards: string[] = []
  for (const board of Object.keys(boardrunners)) {
    if (boardrunners[board] === player) {
      boards.push(board)
    }
  }
  for (let i = 0; i < boards.length; ++i) {
    revokeboardrunnerassignment(vm, boards[i])
  }
  return boards
}

/** If the board has no ack slot, pick a winner and install (same logic as vm tick). */
export function ensureboardrunnerelected(
  vm: DEVICE,
  board: string,
  timestamp: number,
): void {
  if (!isstring(board) || !board) {
    return
  }
  const lastacktick = ackboardrunners[board]
  if (!ispresent(lastacktick)) {
    const winner = pickboardrunnerwinner(board)
    if (ispresent(winner)) {
      installboardrunner(vm, board, winner, timestamp)
    }
  }
}

export function pickboardrunnerwinner(board: string): string | undefined {
  const players = memoryreadplayersfromboard(board)
  const [winner] = players
    .filter((player) => !skipboardrunners[player])
    .sort((a, b) => tracking[b] - tracking[a])
  return ispresent(winner) ? winner : undefined
}

export function boardhasvalidrunner(board: string): boolean {
  const current = boardrunners[board]
  if (!isstring(current) || !current) {
    return false
  }
  return memoryreadplayersfromboard(board).includes(current)
}

export function installboardrunner(
  vm: DEVICE,
  board: string,
  winner: string,
  timestamp: number,
): void {
  // revoke the previous runner
  const previous = boardrunners[board]
  if (previous === winner) {
    return
  }
  if (ispresent(previous)) {
    memorysyncrevokeboardrunner(previous, board)
    boardrunnerowned(vm, previous, '')
  }
  // start tracking the winner
  boardrunners[board] = winner
  ackboardrunners[board] = timestamp
  delete skipboardrunners[winner]
  // signal the winner is now running the board
  memorysyncadmitboardrunner(winner, board)
  boardrunnerowned(vm, winner, board)
}
