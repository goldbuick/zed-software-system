import { pick } from 'zss/mapping/array'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'

import { boardrunneracks, boardrunnerblocked, boardrunners } from './state'

const TICK_BUDGET = Math.round(TICK_FPS * 2)

export function boardrunnereligibleforboard(board: string): string[] {
  const maybeboard = memoryreadboardbyaddress(board)
  const players = memoryreadplayersonboard(maybeboard)
  return players.filter((player) => !boardrunnerblocked[player])
}

export function boardrunnerassignmentvalid(board: string): boolean {
  // console.info('VM => boardrunnerassignmentvalid', board)
  const runner = boardrunners[board]
  const maybeboard = memoryreadboardbyaddress(board)
  if (!ispresent(runner) || !ispresent(maybeboard)) {
    return false
  }
  const players = memoryreadplayersonboard(maybeboard)
  if (!players.includes(runner) || boardrunnerblocked[runner]) {
    return false
  }
  return true
}

export function boardrunnerblock(runner: string): void {
  boardrunnerblocked[runner] = true
}

export function boardrunnerevict(board: string): void {
  if (!ispresent(boardrunners[board])) {
    return
  }
  const runner = boardrunners[board]
  delete boardrunners[board]
  delete boardrunneracks[runner]
  console.info('### evict', runner, board)
}

export function boardrunnerelect(board: string): MAYBE<string> {
  const elected = pick(...boardrunnereligibleforboard(board))
  if (ispresent(elected)) {
    boardrunnerassign(board, elected)
  }
  return elected
}

export function boardrunnerassign(board: string, runner: string) {
  boardrunners[board] = runner
  boardrunneracks[runner] = TICK_BUDGET
  boardrunnerblocked[runner] = false
  console.info('### assign', runner, board)
}

export function boardrunnerbudgetdec(runner: string): boolean {
  boardrunneracks[runner] ??= TICK_BUDGET
  --boardrunneracks[runner]
  if (boardrunneracks[runner] < 1) {
    return true
  }
  return false
}

export function boardrunnerbudgetack(runner: string) {
  boardrunneracks[runner] = TICK_BUDGET
}
