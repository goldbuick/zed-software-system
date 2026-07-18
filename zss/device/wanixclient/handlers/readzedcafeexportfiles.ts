import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applyzedcafeexportfiles } from 'zss/device/wanixclient/wanixzedcafe'

export function handlereadzedcafeexportfiles(
  device: DEVICE,
  message: MESSAGE,
): void {
  applyzedcafeexportfiles(device, message.player, message.data)
}
