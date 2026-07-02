import { createdevice } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { showwanixmenu } from 'zss/feature/wanix/wanixmenu'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  startwanixvm,
  stopwanixvm,
} from 'zss/feature/wanix/wanixvm'
import { isstring } from 'zss/mapping/types'

const wanix = createdevice('wanix', [], (message) => {
  if (!wanix.session(message)) {
    return
  }

  const player = registerreadplayer()
  if (message.player !== player) {
    return
  }

  switch (message.target) {
    case 'show':
      showwanixmenu(message.player)
      break
    case 'vm-start':
      doasync(wanix, message.player, async () => {
        try {
          const vmid = isstring(message.data) ? message.data : DEFAULT_WANIX_VM_ID
          const result = await startwanixvm(DEFAULT_WANIX_VM_MEM, vmid)
          if (result.already) {
            apilog(
              wanix,
              message.player,
              `wanix vm already running vrid=${result.vrid ?? '?'}`,
            )
            return
          }
          apilog(
            wanix,
            message.player,
            `wanix vm started vrid=${result.vrid ?? '?'}`,
          )
        } catch (err) {
          apierror(
            wanix,
            message.player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        }
      })
      break
    case 'vm-stop':
      doasync(wanix, message.player, async () => {
        try {
          const vmid = isstring(message.data) ? message.data : DEFAULT_WANIX_VM_ID
          await stopwanixvm(vmid)
          apilog(wanix, message.player, 'wanix vm stopped')
        } catch (err) {
          apierror(
            wanix,
            message.player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        }
      })
      break
    default:
      break
  }
})

export { wanix }
