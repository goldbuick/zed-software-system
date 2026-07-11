import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apilog } from 'zss/device/api'
import { detachwanixterm } from 'zss/feature/wanix/wanixattachstate'

export function handledetach(device: DEVICE, message: MESSAGE): void {
  detachwanixterm()
  apilog(device, message.player, 'wanix detached')
}
