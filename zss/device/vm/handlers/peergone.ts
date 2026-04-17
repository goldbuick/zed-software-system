import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
} from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'

// Phase 3 failover: when a peer's webrtc dataconnection closes we clear
// any board-runner election entries that reference the departed player.
// With those slots empty, the next `second`-cycle election (see
// `handlesecond`) picks a fresh runner from the players currently on the
// board.
export function handlepeergone(vm: DEVICE, message: MESSAGE): void {
  const player = message.player
  if (!isstring(player) || player.length === 0) {
    return
  }
  let cleared = 0
  const boards = Object.keys(boardrunners)
  for (let i = 0; i < boards.length; ++i) {
    const boardid = boards[i]
    if (boardrunners[boardid] === player) {
      delete boardrunners[boardid]
      ++cleared
    }
    if (ackboardrunners[boardid] === player) {
      delete ackboardrunners[boardid]
    }
    if (failedboardrunners[boardid]) {
      delete failedboardrunners[boardid][player]
    }
  }
  if (cleared > 0) {
    apilog(
      vm,
      '',
      'peergone',
      `cleared ${cleared} runner slot(s) for ${player}`,
    )
  }
}
