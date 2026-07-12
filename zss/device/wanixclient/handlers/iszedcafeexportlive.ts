import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { applyzedcafeexportlive } from 'zss/device/wanixclient/wanixzedcafe'

export function handleiszedcafeexportlive(
  device: DEVICE,
  message: MESSAGE,
): void {
  applyzedcafeexportlive(device, message.player, message.data)
}
