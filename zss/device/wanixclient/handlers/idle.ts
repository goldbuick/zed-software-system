import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { markwanixidle } from 'zss/device/wanixclient/wanixbridge'
import { resetwanixzedcafeonidle } from 'zss/device/wanixclient/wanixzedcafe'

export function handleidle(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  markwanixidle()
  resetwanixzedcafeonidle()
}
