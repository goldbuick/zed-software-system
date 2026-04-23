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
  const previous = boardrunners[board]
  if (ispresent(previous)) {
    memorysyncrevokeboardrunner(previous, board)
    boardrunnerowned(vm, previous, '')
  }
  boardrunners[board] = winner
  ackboardrunners[board] = timestamp
  delete skipboardrunners[winner]
  memorysyncadmitboardrunner(winner, board)
  boardrunnerowned(vm, winner, board)
}
