import { createdevice } from 'zss/device'
import { registerreadplayer } from 'zss/device/register'
import {
  wanixhandleattach,
  wanixhandlebindscroll,
  wanixhandledommount,
  wanixhandledetach,
  wanixhandleshownenu,
  wanixhandlestop,
  wanixhandletermwrite,
  wanixhandlevmstart,
  wanixhandlevmstop,
} from 'zss/feature/wanix/wanixcommands'
import { wanixhandledrop } from 'zss/feature/wanix/wanixlaunch'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring } from 'zss/mapping/types'

type WANIX_DROP_PAYLOAD = {
  label: string
  kind: 'wasm' | 'bundle'
  bytes: Uint8Array
}

function readwanixdroppayload(data: unknown): WANIX_DROP_PAYLOAD | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as WANIX_DROP_PAYLOAD
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

type WANIX_BIND_SCROLL_PAYLOAD = {
  scrollname: string
  path: string
  text: string
}

function readwanixbindscrollpayload(
  data: unknown,
): WANIX_BIND_SCROLL_PAYLOAD | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as WANIX_BIND_SCROLL_PAYLOAD
  if (!isstring(payload.scrollname) || !payload.scrollname.trim()) {
    return undefined
  }
  if (!isstring(payload.path) || !payload.path.trim()) {
    return undefined
  }
  if (!isstring(payload.text)) {
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
    case 'stop':
      doasync(wanix, message.player, async () => {
        const taskid = isstring(message.data) ? message.data : undefined
        await wanixhandlestop(wanix, message.player, taskid)
      })
      break
    case 'vm-start':
      doasync(wanix, message.player, async () => {
        const vmid = isstring(message.data) ? message.data : undefined
        await wanixhandlevmstart(wanix, message.player, vmid)
      })
      break
    case 'vm-stop':
      doasync(wanix, message.player, async () => {
        const vmid = isstring(message.data) ? message.data : undefined
        await wanixhandlevmstop(wanix, message.player, vmid)
      })
      break
    case 'term-write':
      if (!isstring(message.data)) {
        break
      }
      doasync(wanix, message.player, async () => {
        await wanixhandletermwrite(wanix, message.player, message.data)
      })
      break
    case 'detach':
      wanixhandledetach(wanix, message.player)
      break
    case 'attach':
      doasync(wanix, message.player, async () => {
        const taskid = isstring(message.data) ? message.data : undefined
        await wanixhandleattach(wanix, message.player, taskid)
      })
      break
    case 'unbind-show':
    case 'show':
      doasync(wanix, message.player, async () => {
        await wanixhandleshownenu(wanix, message.player)
      })
      break
    case 'drop': {
      const payload = readwanixdroppayload(message.data)
      if (!payload) {
        break
      }
      doasync(wanix, message.player, async () => {
        await wanixhandledrop(
          wanix,
          message.player,
          payload.label,
          payload.kind,
          payload.bytes,
        )
      })
      break
    }
    case 'bind-scroll': {
      const payload = readwanixbindscrollpayload(message.data)
      if (!payload) {
        break
      }
      doasync(wanix, message.player, async () => {
        await wanixhandlebindscroll(wanix, message.player, payload)
      })
      break
    }
    case 'dom-mount':
      doasync(wanix, message.player, async () => {
        const scrollname = isstring(message.data) ? message.data : undefined
        await wanixhandledommount(wanix, message.player, scrollname)
      })
      break
    default:
      break
  }
})

export { wanix }
