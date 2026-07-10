import { createdevice } from 'zss/device'
import { apierror, apilog, vmwanixattach } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  detachwanixterm,
  readattachedsession,
  readwanixactivesession,
  setattachedsession,
  subscribewanixattach,
} from 'zss/feature/wanix/wanixattachstate'
import { showwanixmenu } from 'zss/feature/wanix/wanixmenu'
import {
  halttaskinroom,
  handlewanixbinddrop,
  handlewanixdrop,
  readwanixroomconfig,
  startwanixvm,
  stopwanixroom,
  stopwanixvm,
} from 'zss/feature/wanix/wanixroom'
import type {
  WanixBindDropPayload,
  WanixDropPayload,
} from 'zss/feature/wanix/wanixroomtypes'
import {
  DEFAULT_WANIX_VM_ID,
  DEFAULT_WANIX_VM_MEM,
} from 'zss/feature/wanix/wanixroomtypes'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { readwanixtermbufferkeys } from 'zss/feature/wanix/wanixtermbuffer'
import {
  writewanixtermdump,
  writewanixtermstatus,
} from 'zss/feature/wanix/wanixtermhandlers'
import {
  resolvevmzedcafeimportwaiter,
  wanixhandleexportstate,
} from 'zss/feature/wanix/wanixzedcafe'
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

function readwanixdroppayload(data: unknown): {
  payload?: WanixDropPayload
  reject?: string
} {
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

function readwanixbinddroppayload(data: unknown): {
  payload?: WanixBindDropPayload
  reject?: string
} {
  if (!ispresent(data) || typeof data !== 'object') {
    return { reject: 'bind-drop payload missing' }
  }
  const raw = data as WanixBindDropPayload
  if (!isstring(raw.label) || !raw.label.trim()) {
    return { reject: 'bind-drop label missing' }
  }
  if (raw.kind !== 'file' && raw.kind !== 'archive') {
    return { reject: `bind-drop kind invalid: ${String(raw.kind)}` }
  }
  if (!isstring(raw.dst) || !raw.dst.trim()) {
    return { reject: 'bind-drop dst missing' }
  }
  if (!isstring(raw.perm) || !raw.perm.trim()) {
    return { reject: 'bind-drop perm missing' }
  }
  const bytes = normalizewanixdropbytes(raw.bytes)
  if (!bytes) {
    return { reject: 'bind-drop bytes invalid' }
  }
  return {
    payload: {
      label: raw.label,
      kind: raw.kind,
      bytes,
      dst: raw.dst.trim(),
      perm: raw.perm.trim(),
    },
  }
}

type WANIX_EXPORT_STATE_PAYLOAD = {
  files: WANIX_ZED_CAFE_EXPORT_FILE[]
}

function readwanixexportstatepayload(
  data: unknown,
): WANIX_EXPORT_STATE_PAYLOAD | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as WANIX_EXPORT_STATE_PAYLOAD
  if (!Array.isArray(payload.files)) {
    return undefined
  }
  for (let i = 0; i < payload.files.length; ++i) {
    const file = payload.files[i]
    if (!ispresent(file) || typeof file.path !== 'string') {
      return undefined
    }
    if (file.bytes instanceof Uint8Array) {
      continue
    }
    if (Array.isArray(file.bytes)) {
      file.bytes = new Uint8Array(file.bytes as number[])
      continue
    }
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
          const idle = readwanixroomconfig().mode === 'idle'
          if (!idle) {
            apilog(
              wanix,
              message.player,
              'wanix: drop on active room (export sync if needed)…',
            )
          }
          const result = await handlewanixdrop(payload, wanix, message.player)
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
    case 'bind-drop': {
      const parsed = readwanixbinddroppayload(message.data)
      if (!parsed.payload) {
        apierror(
          wanix,
          message.player,
          'wanix',
          parsed.reject ?? 'bind-drop payload rejected',
        )
        break
      }
      const sessionkey = readattachedsession()
      if (!sessionkey) {
        apilog(wanix, message.player, 'wanix bind failed: no attached session')
        break
      }
      if (readwanixroomconfig().mode === 'idle') {
        apilog(wanix, message.player, 'wanix bind failed: room idle')
        break
      }
      const payload = parsed.payload
      doasync(wanix, message.player, async () => {
        try {
          const result = await handlewanixbinddrop(payload, sessionkey)
          apilog(
            wanix,
            message.player,
            `wanix bind ${payload.label} → ${result.sessionkey} at ${result.dst}`,
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
          apilog(
            wanix,
            message.player,
            'wanix: vm booting — zedcafe export finalizes after guest is ready…',
          )
          const result = await startwanixvm(
            DEFAULT_WANIX_VM_MEM,
            vmid,
            wanix,
            message.player,
          )
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
    case 'attach': {
      const keys = readwanixtermbufferkeys()
      const activesession = readwanixactivesession()
      const requested =
        isstring(message.data) && message.data.trim()
          ? message.data.trim()
          : (activesession ?? keys[0])
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
    case 'term-dump': {
      const payload =
        ispresent(message.data) && typeof message.data === 'object'
          ? (message.data as { sessionkey?: unknown; tail?: unknown })
          : {}
      const sessionkey =
        isstring(payload.sessionkey) && payload.sessionkey.trim()
          ? payload.sessionkey.trim()
          : undefined
      const tail =
        typeof payload.tail === 'number' && payload.tail > 0
          ? Math.floor(payload.tail)
          : undefined
      writewanixtermdump(wanix, message.player, sessionkey, tail)
      break
    }
    case 'term-status':
      writewanixtermstatus(wanix, message.player)
      break
    case 'export-state': {
      const payload = readwanixexportstatepayload(message.data)
      if (!payload) {
        apierror(
          wanix,
          message.player,
          'wanix',
          'zedcafe export-state payload rejected',
        )
        break
      }
      doasync(wanix, message.player, async () => {
        await wanixhandleexportstate(wanix, message.player, payload.files)
      })
      break
    }
    case 'import-result': {
      const data = message.data
      if (
        !ispresent(data) ||
        typeof data !== 'object' ||
        typeof (data as { ok?: unknown }).ok !== 'boolean'
      ) {
        apierror(
          wanix,
          message.player,
          'wanix',
          'zedcafe import-result payload rejected',
        )
        break
      }
      const payload = data as {
        ok: boolean
        changed?: boolean
        error?: string
        bookcount?: number
      }
      resolvevmzedcafeimportwaiter({
        ok: payload.ok,
        changed: !!payload.changed,
        error: typeof payload.error === 'string' ? payload.error : undefined,
        bookcount:
          typeof payload.bookcount === 'number' ? payload.bookcount : undefined,
      })
      break
    }
    default:
      break
  }
})

subscribewanixattach(() => {
  vmwanixattach(SOFTWARE, registerreadplayer(), readattachedsession())
})

export { wanix }
