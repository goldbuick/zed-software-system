import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applyzedcafetaskrid } from 'zss/device/wanixclient/wanixzedcafe'

export function handlereadzedcafetaskrid(
  device: DEVICE,
  message: MESSAGE,
): void {
  applyzedcafetaskrid(device, message.player, message.data)
}
