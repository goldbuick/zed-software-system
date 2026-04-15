import type { DEVICE } from 'zss/device'
import { type MESSAGE, registerboardrunnerask } from 'zss/device/api'
import { boardrunners, tracking } from 'zss/device/vm/state'
import { ispresent } from 'zss/mapping/types'
import { memoryreadboardrunnerchoices } from 'zss/memory/playermanagement'
import { memorytickmain } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadhalt,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

import { pilottick } from './pilot'

export function handletick(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadsimfreeze()) {
    return
  }
  perfmeasure('vm:pilottick', () => {
    pilottick(vm)
  })
  perfmeasure('vm:memorytickmain', () => {
    memorytickmain(memoryreadhalt())
  })

  // Board runner election: same `tracking` as DOOT idle (incremented above when sim is unfrozen).
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const { runnerchoices, playeridsbyboard } = memoryreadboardrunnerchoices(
    mainbook,
    tracking,
  )

  // iterate through active boards
  const choiceboards = Object.keys(runnerchoices)
  for (let i = 0; i < choiceboards.length; ++i) {
    const boardid = choiceboards[i]
    const maybeplayer = boardrunners[boardid]
    const playerids = playeridsbyboard[boardid] ?? []
    if (ispresent(maybeplayer)) {
      // validate the the picked player is still active on the given board
      if (playerids.includes(maybeplayer)) {
        // keep it
      } else {
        // remove it
        delete boardrunners[boardid]
      }
    }
    // elect a player
    if (!ispresent(boardrunners[boardid])) {
      boardrunners[boardid] = runnerchoices[boardid]
      // signal the board runner that they have been elected
      registerboardrunnerask(vm, boardrunners[boardid], boardid)
    }
  }

  // drop runners with no active players
  const activeboards = Object.keys(boardrunners)
  for (let i = 0; i < activeboards.length; ++i) {
    const boardid = activeboards[i]
    const playerids = playeridsbyboard[boardid] ?? []
    if (playerids.length === 0) {
      delete boardrunners[boardid]
    }
  }
}
