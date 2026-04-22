import type { DEVICE } from 'zss/device'
import { type MESSAGE, vmlocal } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { memoryhasflags } from 'zss/memory/flags'

export function handlelastinputtouch(vm: DEVICE, message: MESSAGE): void {
  if (message.player.includes('local') && !memoryhasflags(message.player)) {
    vmlocal(vm, message.player)
  }
  if (!message.player.includes('local') || memoryhasflags(message.player)) {
    lastinputtime[message.player] = Date.now()
  }
}
