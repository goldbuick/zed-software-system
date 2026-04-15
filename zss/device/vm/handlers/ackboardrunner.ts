import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ackboardrunners } from 'zss/device/vm/state'

export function handleackboardrunner(_vm: DEVICE, message: MESSAGE): void {
  console.info('got ackboardrunner', message.player, message.data)
  ackboardrunners[message.data] = message.player
}
