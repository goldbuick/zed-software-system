import { pick } from 'zss/mapping/array'
import { TICK_FPS } from 'zss/mapping/tick'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryreadplayersonboard } from 'zss/memory/boardaccess'
import { memoryreadboardbyaddress } from 'zss/memory/boards'

import {
  boardrunneraccess,
  boardrunneracks,
  boardrunnerblocked,
  boardrunners,
  playerrunners,
} from './state'

const TICK_BUDGET = Math.round(TICK_FPS * 2)

export function boardrunnerboardforplayer(player: string): MAYBE<string> {
  return playerrunners[player]
}

export function boardrunnertrackaccess(board: string, accessboard: string) {
  if (!board || !accessboard) {
    return
  }
  boardrunneraccess[board] ??= []
  if (!boardrunneraccess[board].includes(accessboard)) {
    boardrunneraccess[board].push(accessboard)
  }
}

export function boardrunneraccessfor(board: string): string[] {
  const list = boardrunneraccess[board] ?? []
  return [board, ...list]
}

export function boardrunnereligibleforboard(board: string): string[] {
  const maybeboard = memoryreadboardbyaddress(board)
  const players = memoryreadplayersonboard(maybeboard)
  return players.filter((player) => !boardrunnerblocked[player])
}

export function boardrunnerassignmentvalid(board: string): boolean {
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
  if (playerrunners[runner] === board) {
    delete playerrunners[runner]
  }
  delete boardrunneracks[runner]
}

export function boardrunnerelect(board: string): MAYBE<string> {
  const elected = pick(...boardrunnereligibleforboard(board))
  if (ispresent(elected)) {
    boardrunnerassign(board, elected)
  } else {
    boardrunnerevict(board)
  }
  return elected
}

export function boardrunnerassign(board: string, runner: string) {
  const oldrunner = boardrunners[board]
  if (ispresent(oldrunner) && oldrunner !== runner) {
    delete playerrunners[oldrunner]
  }
  const oldboard = playerrunners[runner]
  if (oldboard && oldboard !== board) {
    delete boardrunners[oldboard]
  }
  boardrunners[board] = runner
  playerrunners[runner] = board
  boardrunneracks[runner] = TICK_BUDGET
  boardrunnerblocked[runner] = false
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
