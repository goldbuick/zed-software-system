import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { markwanixready } from 'zss/device/wanixclient/wanixbridge'

export function handleready(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  markwanixready()
}
