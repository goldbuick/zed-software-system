import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { runzedcafeexport } from 'zss/feature/wanix/wanixstateexport'

export function handleexportzedcafe(vm: DEVICE, message: MESSAGE): void {
  runzedcafeexport(vm, message.player)
}
