import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'

import { showwanixmenu } from './wanixmenu'

export function handleshow(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    try {
      await showwanixmenu(message.player)
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
