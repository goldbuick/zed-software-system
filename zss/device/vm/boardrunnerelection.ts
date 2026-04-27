import type { DEVICE } from 'zss/device'
import { boardrunnerowned } from 'zss/device/api'
import {
  memorysyncadmitboardrunner,
  memorysyncmarkmemorydirty,
  memorysyncreplstreamidsforboardrunner,
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
export function revokeboardrunnerassignment(board: string): void {
  const runner = boardrunners[board]
  if (!ispresent(runner)) {
    return
  }
  memorysyncrevokeboardrunner(runner, board)
  memorysyncmarkmemorydirty()
  delete ackboardrunners[board]
  delete boardrunners[board]
}

/** Revokes every board this player is recorded as running; returns affected board ids. */
export function revokeboardrunnerassignmentsforplayer(
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
    revokeboardrunnerassignment(boards[i])
  }
  return boards
}

/** If the board has no ack slot, pick a winner and install (same logic as vm tick). */
export function ensureboardrunnerelected(
  vm: DEVICE,
  board: string,
  timestamp: number,
): void {
  if (
    !ispresent(ackboardrunners[board]) ||
    boardhasvalidrunner(board) === false
  ) {
    const winner = pickboardrunnerwinner(board)
    if (ispresent(winner)) {
      installboardrunner(vm, board, winner, timestamp)
    }
  }
}

export function pickboardrunnerwinner(board: string): string | undefined {
  const players = memoryreadplayersfromboard(board)
  const operator = memoryreadoperator()
  if (players.includes(operator) && !skipboardrunners[operator]) {
    return operator
  }
  const [winner] = players
    .filter((player) => !skipboardrunners[player])
    .sort((a, b) => tracking[b] - tracking[a])
  return winner
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
  // start tracking the winner
  boardrunners[board] = winner
  ackboardrunners[board] = timestamp

  // unskip the winner
  delete skipboardrunners[winner]

  // admit the winner as the boardrunner streams
  memorysyncadmitboardrunner(winner, board)
  memorysyncmarkmemorydirty()

  // signal the winner is now running the board
  const streams = memorysyncreplstreamidsforboardrunner(board)
  boardrunnerowned(vm, winner, [board, streams])
}
