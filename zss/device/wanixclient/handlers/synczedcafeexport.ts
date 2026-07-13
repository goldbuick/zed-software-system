import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applyzedcafesyncresult } from 'zss/device/wanixclient/wanixzedcafe'

export function handlesynczedcafeexport(
  device: DEVICE,
  message: MESSAGE,
): void {
  applyzedcafesyncresult(device, message.player, message.data)
}
