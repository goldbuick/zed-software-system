import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { markwanixready } from 'zss/device/wanixclient/wanixbridge'

export function handleping(_device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (
    data &&
    typeof data === 'object' &&
    (data as { ok?: unknown }).ok === false
  ) {
    return
  }
  markwanixready()
}
