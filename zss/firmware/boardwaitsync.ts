import type { CHIP } from 'zss/chip'
import { vmboardrunneraccess } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { memoryisboardready } from 'zss/memory/boardwait'

/** Returns 1 to wait until next tick when board boundary is not hydrated yet. */
export function firmwarewaitforboard(chip: CHIP, board: string): 0 | 1 {
  if (memoryisboardready(board)) {
    return 0
  }
  //
  //vmboardrunneraccess(SOFTWARE, runner, board)
  return 1
}
