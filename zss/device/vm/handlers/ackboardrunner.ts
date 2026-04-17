import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnersendsnapshot } from 'zss/device/vm/helpers'
import { ackboardrunners, boardrunners } from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'

export function handleackboardrunner(_vm: DEVICE, message: MESSAGE): void {
  const boardid = message.data
  if (!isstring(boardid) || !boardid) {
    return
  }
  if (message.player !== boardrunners[boardid]) {
    return
  }
  ackboardrunners[boardid] = message.player
  boardrunnersendsnapshot(message.player, boardid)
}
