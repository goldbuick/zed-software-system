import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { tracking, trackinglastlog } from 'zss/device/vm/state'

export function handledoot(vm: DEVICE, message: MESSAGE): void {
  tracking[message.player] = 0
  trackinglastlog[message.player] = trackinglastlog[message.player] ?? 0
  if (trackinglastlog[message.player] % 32 === 0) {
    apilog(vm, message.player, `$whiteactive $blue${message.player}`)
  }
  ++trackinglastlog[message.player]
}
