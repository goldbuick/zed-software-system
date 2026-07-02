import { createdevice } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { showwanixmenu } from 'zss/feature/wanix/wanixmenu'
import {
  halttaskinroom,
  handlewanixdrop,
  stopwanixroom,
} from 'zss/feature/wanix/wanixroom'
import type { WanixDropPayload } from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
  startwanixvm,
  stopwanixvm,
} from 'zss/feature/wanix/wanixvm'
import { ispresent, isstring } from 'zss/mapping/types'

function readwanixdroppayload(data: unknown): WanixDropPayload | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as WanixDropPayload
  if (!isstring(payload.label) || !payload.label.trim()) {
    return undefined
  }
  if (payload.kind !== 'wasm' && payload.kind !== 'bundle') {
    return undefined
  }
  if (!(payload.bytes instanceof Uint8Array)) {
    return undefined
  }
  return payload
}

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
    case 'drop': {
      const payload = readwanixdroppayload(message.data)
      if (!payload) {
        break
      }
      doasync(wanix, message.player, async () => {
        try {
          const result = await handlewanixdrop(payload)
          if (result.cmd) {
            apilog(
              wanix,
              message.player,
              `wanix run ${result.taskid} ${result.cmd}`,
            )
          } else if (payload.kind === 'bundle') {
            apilog(
              wanix,
              message.player,
              `wanix bundle ${result.taskid} has no .wasm entries`,
            )
          }
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
    }
    case 'stop':
      doasync(wanix, message.player, async () => {
        try {
          if (isstring(message.data) && message.data.trim()) {
            await halttaskinroom(message.data)
            apilog(wanix, message.player, `wanix task stopped ${message.data}`)
            return
          }
          await stopwanixroom()
          apilog(wanix, message.player, 'wanix stopped')
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
    case 'vm-start':
      doasync(wanix, message.player, async () => {
        try {
          const vmid = isstring(message.data)
            ? message.data
            : DEFAULT_WANIX_VM_ID
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
          const vmid = isstring(message.data)
            ? message.data
            : DEFAULT_WANIX_VM_ID
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
