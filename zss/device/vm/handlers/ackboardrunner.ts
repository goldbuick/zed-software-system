import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  ackboardrunners,
  boardrunners,
  failedboardrunners,
} from 'zss/device/vm/state'
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
  const byboard = failedboardrunners[boardid]
  if (byboard) {
    delete byboard[message.player]
    if (Object.keys(byboard).length === 0) {
      delete failedboardrunners[boardid]
    }
  }
}
