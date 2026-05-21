import { vmboardrunneraccess } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { memoryisboardready } from 'zss/memory/boardwait'
import { memoryreadboardrunner } from 'zss/memory/session'

/** Returns 1 to wait until next tick when board boundary is not hydrated yet. */
export function firmwarewaitforboard(board: string): 0 | 1 {
  if (memoryisboardready(board)) {
    return 0
  }
  vmboardrunneraccess(SOFTWARE, memoryreadboardrunner(), board)
  return 1
}
