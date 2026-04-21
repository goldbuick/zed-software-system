import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog, boardrunnerowned } from 'zss/device/api'
import {
  memorysyncdropplayerfromall,
  memorysyncrevokeboardrunner,
} from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  clearboardrunnerlastacktick,
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
      memorysyncrevokeboardrunner(player, boardid)
      delete boardrunners[boardid]
      clearboardrunnerlastacktick(boardid)
      ++cleared
    }
    if (ackboardrunners[boardid] === player) {
      // also covers the case where boardrunners[boardid] was a different
      // pending ask but the acked owner is the departed player.
      memorysyncrevokeboardrunner(player, boardid)
      delete ackboardrunners[boardid]
      clearboardrunnerlastacktick(boardid)
    }
    if (failedboardrunners[boardid]) {
      delete failedboardrunners[boardid][player]
      if (Object.keys(failedboardrunners[boardid]).length === 0) {
        delete failedboardrunners[boardid]
      }
    }
  }
  // Drop the departed player from the shared memory stream too. If we don't,
  // their slot in the jsonsync peer set would receive pokes forever.
  memorysyncdropplayerfromall(player)
  // Tell the (now departed) player's worker the ownership set is empty.
  // In practice the worker is gone with the peer, but the emit is cheap and
  // keeps server-side bookkeeping consistent (e.g. local main-thread
  // boardrunner worker when a local player logs out without a peer).
  boardrunnerowned(vm, player, '')
  if (cleared > 0) {
    apilog(
      vm,
      '',
      'peergone',
      `cleared ${cleared} runner slot(s) for ${player}`,
    )
  }
}
