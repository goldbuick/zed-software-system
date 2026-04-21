import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { applyboardrunnerackpromotion } from 'zss/device/vm/handlers/ackboardrunner'
import {
  ackboardrunners,
  boardrunnerlastacktickat,
  boardrunners,
} from 'zss/device/vm/state'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadbookflag } from 'zss/memory/bookoperations'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

/**
 * Boardrunner worker finished one `boardrunner:tick` for `assignedboard`
 * (`boardrunner.reply(..., 'acktick', assignedboard)` in `zss/device/boardrunner.ts`).
 * Confirms election (same role as the former `vm:ackboardrunner` path) and
 * records liveness for stale eviction.
 */
export function handleacktick(vm: DEVICE, message: MESSAGE): void {
  const boardid = message.data
  if (!isstring(boardid) || !boardid) {
    return
  }
  if (message.player !== boardrunners[boardid]) {
    return
  }

  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const playerboard = memoryreadbookflag(mainbook, message.player, 'board')
  if (!isstring(playerboard) || playerboard !== boardid) {
    return
  }

  boardrunnerlastacktickat[boardid] = Date.now()

  if (ackboardrunners[boardid] === message.player) {
    return
  }

  applyboardrunnerackpromotion(vm, message.player, boardid)
}
