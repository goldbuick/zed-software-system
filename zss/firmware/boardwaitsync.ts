import { vmboardrunneraccess } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryisboardready } from 'zss/memory/boardwait'
import {
  memoryreadassignedboard,
  memoryreadboardrunner,
} from 'zss/memory/session'

// return true to wait until next tick when board boundary is not hydrated yet
export function firmwarewaitforboard(board: MAYBE<string>) {
  if (ispresent(board)) {
    if (memoryisboardready(board)) {
      return false
    }
    vmboardrunneraccess(
      SOFTWARE,
      memoryreadboardrunner(),
      memoryreadassignedboard(),
      board,
    )
  }
  return true
}
