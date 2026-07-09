import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { isclimode } from 'zss/feature/detect'
import { warmwanixzedcafe } from 'zss/feature/wanix/wanixroom'

/** Warm wanix + zedcafe export after VM memory books are loaded. */
export function handlewanixwarm(device: DEVICE, message: MESSAGE): void {
  if (isclimode()) {
    return
  }
  doasync(device, message.player, async () => {
    await warmwanixzedcafe(device, message.player)
  })
}
