import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { handlewanixdrop } from 'zss/device/wanixclient/wanixroom'
import { isarray, isstring } from 'zss/mapping/types'

export function handledrop(device: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data) || message.data.length < 3) {
    return
  }
  const [label, kind, bytes] = message.data
  if (!isstring(label) || (kind !== 'wasm' && kind !== 'bundle')) {
    return
  }
  if (!(bytes instanceof Uint8Array)) {
    return
  }
  doasync(device, message.player, async () => {
    try {
      await handlewanixdrop({ label, kind, bytes }, device, message.player)
    } catch (err) {
      apierror(
        device,
        message.player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      )
    }
  })
}
