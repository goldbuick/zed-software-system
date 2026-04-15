import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmlogout } from 'zss/device/api'
import { savestate } from 'zss/device/vm/helpers'
import {
  FLUSH_RATE,
  SECOND_TIMEOUT,
  boardrunners,
  incflushtick,
  setflushtick,
  tracking,
} from 'zss/device/vm/state'
import { doasync } from 'zss/mapping/func'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadboardrunnerchoices,
  memoryscanplayers,
} from 'zss/memory/playermanagement'
import {
  memoryreadbookbysoftware,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'
import { perfmeasure } from 'zss/perf/ui'

export function handlesecond(vm: DEVICE, message: MESSAGE): void {
  perfmeasure('vm:second', () => {
    memoryscanplayers(tracking)

    if (!memoryreadsimfreeze()) {
      const players = Object.keys(tracking)
      for (let i = 0; i < players.length; ++i) {
        ++tracking[players[i]]
      }
      for (let i = 0; i < players.length; ++i) {
        const player = players[i]
        if (tracking[player] >= SECOND_TIMEOUT) {
          vmlogout(vm, player, false)
        }
      }
    }

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

    const flushtick = incflushtick()
    if (flushtick >= FLUSH_RATE) {
      setflushtick(0)
      doasync(vm, message.player, async () => {
        await savestate(vm, true)
      })
    }
  })
}
