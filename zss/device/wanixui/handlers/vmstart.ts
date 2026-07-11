import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { startwanixvm } from 'zss/feature/wanix/wanixroom'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
} from 'zss/feature/wanix/wanixroomtypes'
import { isstring } from 'zss/mapping/types'

export function handlevmstart(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    try {
      const vmid = isstring(message.data) ? message.data : DEFAULT_WANIX_VM_ID
      apilog(
        device,
        message.player,
        'wanix: vm booting — zedcafe export finalizes after guest is ready…',
      )
      const result = await startwanixvm(
        DEFAULT_WANIX_VM_MEM,
        vmid,
        device,
        message.player,
      )
      if (result.already) {
        apilog(
          device,
          message.player,
          `wanix vm already running vrid=${result.vrid ?? '?'}`,
        )
        return
      }
      apilog(
        device,
        message.player,
        `wanix vm started vrid=${result.vrid ?? '?'}`,
      )
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
