import type { DEVICE } from 'zss/device'
import {
  type MESSAGE,
  boardrunnerjsondiffsync,
  boardrunnertick,
} from 'zss/device/api'
import { movementevidencelog } from 'zss/device/movementevidencelog'
import {
  boardrunneracks,
  boardrunnerblocked,
  boardrunners,
  jsondiffsync,
} from 'zss/device/vm/state'
import {
  hubprepareoutboundforleaf,
  jsondiffsynchubapply,
} from 'zss/feature/jsondiffsync/hub'
import { pick } from 'zss/mapping/array'
import { ispid } from 'zss/mapping/guid'
import { TICK_FPS } from 'zss/mapping/tick'
import { ispresent } from 'zss/mapping/types'
import {
  memoryreadactivelist,
  memoryreadbookplayerboards,
} from 'zss/memory/playermanagement'
import { memorytickloaders } from 'zss/memory/runtime'
import {
  memoryreadbookbysoftware,
  memoryreadsimfreeze,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

import { pilottick } from './pilot'

export function handleticktock(vm: DEVICE, _message: MESSAGE): void {
  void _message
  if (memoryreadsimfreeze()) {
    return
  }
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  // #region agent log
  movementevidencelog(
    'vm_ticktock_start',
    { booktimestamp: mainbook.timestamp },
    'movement-order',
  )
  // #endregion
  pilottick(vm)
  memorytickloaders()
  // #region agent log
  movementevidencelog('vm_ticktock_after_pilot_loaders', {}, 'movement-order')
  // #endregion
  let huboutboundcount = 0
  const hubapply = jsondiffsynchubapply(jsondiffsync)
  if (hubapply) {
    const activelist = memoryreadactivelist()
    for (let i = 0; i < activelist.length; ++i) {
      const player = activelist[i]
      const prep = hubprepareoutboundforleaf(jsondiffsync, player)
      if (prep.message !== undefined) {
        huboutboundcount++
        boardrunnerjsondiffsync(vm, player, prep.message)
      }
    }
  }
  // #region agent log
  movementevidencelog(
    'vm_ticktock_after_hub_phase',
    { hubapply, huboutboundcount },
    'movement-order',
  )
  // #endregion
  // get all active boards
  const activeboards = memoryreadbookplayerboards(mainbook)
  // #region agent log
  movementevidencelog(
    'vm_ticktock_before_boardrunner_ticks',
    { activeboardcount: activeboards.length },
    'movement-order',
  )
  // #endregion
  for (let i = 0; i < activeboards.length; ++i) {
    // get the boardrunner player
    const board = activeboards[i]
    // if the boardrunner player is present
    if (ispresent(boardrunners[board.id])) {
      // decrement the boardrunner ack
      const runnerplayer = boardrunners[board.id]
      boardrunneracks[runnerplayer]--
      // add the player to boardrunnerblocks
      if (boardrunneracks[runnerplayer] < 1) {
        // drop failed ack runner
        delete boardrunners[board.id]
        delete boardrunneracks[board.id]
        boardrunnerblocked[runnerplayer] = true
      }
    }
    // if the boardrunner player is not present
    // try to assign a new boardrunner player
    if (!ispresent(boardrunners[board.id])) {
      // try to assign a new boardrunner player
      const playersonboard = Object.keys(board.objects)
        .filter(ispid)
        .filter((player) => !boardrunnerblocked[player])
      const elected = pick(playersonboard)
      // assign the new boardrunner player
      boardrunners[board.id] = elected
      boardrunneracks[elected] = Math.ceil(TICK_FPS)
    }
    // send a boardrunner tick message to the boardrunner player
    if (ispresent(boardrunners[board.id])) {
      boardrunnertick(vm, boardrunners[board.id], board.id, mainbook.timestamp)
    }
  }
  // #region agent log
  movementevidencelog('vm_ticktock_end', {}, 'movement-order')
  // #endregion
}
