import { createdevice } from 'zss/device'
import { apierror, apilog } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import {
  detachwanixterm,
  readwanixactivesession,
  setattachedsession,
} from 'zss/feature/wanix/wanixattachstate'
import { readwanixtermbufferkeys } from 'zss/feature/wanix/wanixtermbuffer'
import { showwanixmenu } from 'zss/feature/wanix/wanixmenu'
import {
  halttaskinroom,
  handlewanixdrop,
  readwanixroomconfig,
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

function normalizewanixdropbytes(data: unknown): Uint8Array | undefined {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (Array.isArray(data) && data.every((value) => typeof value === 'number')) {
    return new Uint8Array(data)
  }
  return undefined
}

function readwanixdroppayload(
  data: unknown,
): { payload?: WanixDropPayload; reject?: string } {
  if (!ispresent(data) || typeof data !== 'object') {
    return { reject: 'drop payload missing' }
  }
  const raw = data as WanixDropPayload
  if (!isstring(raw.label) || !raw.label.trim()) {
    return { reject: 'drop label missing' }
  }
  if (raw.kind !== 'wasm' && raw.kind !== 'bundle') {
    return { reject: `drop kind invalid: ${String(raw.kind)}` }
  }
  const bytes = normalizewanixdropbytes(raw.bytes)
  if (!bytes) {
    return { reject: 'drop bytes invalid' }
  }
  return {
    payload: {
      label: raw.label,
      kind: raw.kind,
      bytes,
    },
  }
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
      doasync(wanix, message.player, async () => {
        try {
          await showwanixmenu(message.player)
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
    case 'drop': {
      const parsed = readwanixdroppayload(message.data)
      if (!parsed.payload) {
        apierror(
          wanix,
          message.player,
          'wanix',
          parsed.reject ?? 'drop payload rejected',
        )
        break
      }
      const payload = parsed.payload
      if (
        import.meta.env.DEV &&
        !((message.data as WanixDropPayload).bytes instanceof Uint8Array)
      ) {
        apilog(
          wanix,
          message.player,
          `wanix drop bytes normalized kind=${payload.kind} len=${payload.bytes.length}`,
        )
      }
      doasync(wanix, message.player, async () => {
        try {
          if (readwanixroomconfig().mode === 'idle') {
            apilog(wanix, message.player, 'wanix task room starting…')
          }
          const result = await handlewanixdrop(payload)
          if (result.spawns.length) {
            for (const spawn of result.spawns) {
              apilog(
                wanix,
                message.player,
                `wanix run ${spawn.taskid} ${spawn.cmd}`,
              )
            }
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
            const taskid = message.data.trim()
            const result = await halttaskinroom(taskid)
            if (result.idle) {
              apilog(wanix, message.player, 'wanix no such task')
              return
            }
            apilog(wanix, message.player, `wanix task stopped ${taskid}`)
            return
          }
          if (readwanixroomconfig().mode === 'idle') {
            apilog(wanix, message.player, 'wanix already idle')
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
          apilog(wanix, message.player, 'wanix vm starting…')
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
    case 'attach': {
      const keys = readwanixtermbufferkeys()
      const activesession = readwanixactivesession()
      const requested =
        isstring(message.data) && message.data.trim()
          ? message.data.trim()
          : activesession ?? keys[0]
      if (!requested) {
        apilog(wanix, message.player, 'wanix no session to attach')
        break
      }
      if (!keys.includes(requested)) {
        apilog(wanix, message.player, `wanix no such session ${requested}`)
        break
      }
      setattachedsession(requested)
      apilog(wanix, message.player, `wanix attached ${requested}`)
      break
    }
    case 'detach':
      detachwanixterm()
      apilog(wanix, message.player, 'wanix detached')
      break
    default:
      break
  }
})

export { wanix }
