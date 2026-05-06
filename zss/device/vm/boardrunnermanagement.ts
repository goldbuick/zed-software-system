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
  console.info('VM => boardrunnerassignmentvalid', board)
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

export function boardrunnerevict(board: string, runner: string): void {
  if (!ispresent(board) || !runner || boardrunners[board] !== runner) {
    return
  }
  delete boardrunners[board]
  delete boardrunneracks[runner]
  console.info('VM => boardrunnerevict', board, runner)
}

export function boardrunnerelect(board: string): MAYBE<string> {
  const eligible = boardrunnereligibleforboard(board)
  if (eligible.length === 0) {
    return undefined
  }
  const elected = pick(...eligible)
  boardrunners[board] = elected
  boardrunneracks[elected] = TICK_BUDGET
  console.info('VM => boardrunnerelect', board, elected)
  return elected
}

export function boardrunnertransfer(board: string, runner: string): void {
  boardrunners[board] = runner
  boardrunneracks[runner] = TICK_BUDGET
  boardrunnerblocked[runner] = false
  console.info('VM => boardrunnertransfer', board, runner)
}

export function boardrunnerbudgetdec(runner: string): boolean {
  boardrunneracks[runner] ??= TICK_BUDGET
  --boardrunneracks[runner]
  if (boardrunneracks[runner] < 1) {
    return true
  }
  return false
}

export function boardrunnerbudgetack(runner: string): void {
  boardrunneracks[runner] = TICK_BUDGET
}
