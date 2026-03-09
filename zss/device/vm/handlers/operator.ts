import type { DEVICE } from 'zss/device'
import { apilog } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/api'
import { memorywriteoperator } from 'zss/memory/session'

export function handleoperator(vm: DEVICE, message: MESSAGE): void {
  memorywriteoperator(message.player)
  apilog(vm, message.player, `operator set to ${message.player}`)
  vm.replynext(message, 'ackoperator', true)
}
