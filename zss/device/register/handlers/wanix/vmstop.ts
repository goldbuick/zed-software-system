import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { DEFAULT_WANIX_VM_ID } from 'zss/feature/wanix/wanixroomtypes'
import { isstring } from 'zss/mapping/types'

import { stopwanixvm } from './wanixroom'

export function handlevmstop(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    try {
      const vmid = isstring(message.data) ? message.data : DEFAULT_WANIX_VM_ID
      await stopwanixvm(vmid)
      apilog(device, message.player, 'wanix vm stopped')
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
