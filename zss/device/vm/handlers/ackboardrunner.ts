import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerowned } from 'zss/device/api'
import { boardrunnersendsnapshot } from 'zss/device/vm/helpers'
import { memorysyncrevokeboardrunner } from 'zss/device/vm/memorysync'
import {
  ackboardrunners,
  boardrunners,
  playerownedboards,
} from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'

export function handleackboardrunner(vm: DEVICE, message: MESSAGE): void {
  const boardid = message.data
  if (!isstring(boardid) || !boardid) {
    return
  }
  if (message.player !== boardrunners[boardid]) {
    return
  }

  // Capture any previous owner before we overwrite. If the election just
  // flipped from another player to this one, the previous owner must have
  // their jsonsync admissions revoked and their worker told it no longer
  // owns this board — otherwise both runners would receive pokes / writes
  // and emit conflicting gadget paints.
  const previous = ackboardrunners[boardid]
  const flipped =
    isstring(previous) && previous.length > 0 && previous !== message.player
  if (flipped) {
    memorysyncrevokeboardrunner(previous, boardid)
  }

  ackboardrunners[boardid] = message.player

  const refresh = new Set<string>()
  if (flipped && isstring(previous) && previous.length > 0) {
    refresh.add(previous)
  }
  refresh.add(message.player)
  refresh.forEach((pid) => {
    boardrunnerowned(vm, pid, playerownedboards(pid))
  })

  boardrunnersendsnapshot(message.player, boardid)
}
