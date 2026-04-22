import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ackboardrunners, boardrunners } from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'

export function handleacktick(_vm: DEVICE, message: MESSAGE): void {
  // expect the player to be the current boardrunner
  const board = message.data
  if (!isstring(board) || message.player !== boardrunners[board]) {
    return
  }

  // track the last ack tick
  ackboardrunners[board] = Date.now()
}
