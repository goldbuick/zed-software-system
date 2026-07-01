import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmplayertoken, vmpullvarresult } from 'zss/device/api'
import {
  isconfigstringkey,
  storagereadvars,
  storagewriteconfig,
  storagewriteconfigstring,
  storagewritevar,
} from 'zss/feature/storage'
import { doasync } from 'zss/mapping/func'
import { isarray, isstring } from 'zss/mapping/types'

export function handlestore(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    if (isarray(message.data)) {
      const [name, value] = message.data
      if (typeof name === 'string' && name.startsWith('config_')) {
        const keyname = name.slice(7)
        if (isconfigstringkey(keyname)) {
          await storagewriteconfigstring(keyname, String(value ?? ''))
        } else {
          await storagewriteconfig(keyname, value)
        }
      } else {
        await storagewritevar(name, value)
      }
    }
  })
}

export function handlepullvar(device: DEVICE, message: MESSAGE): void {
  doasync(device, message.player, async () => {
    const payload = message.data as {
      id?: string
      key?: string
      channel?: string
    }
    const player = message.player
    if (
      !payload ||
      !isstring(payload.id) ||
      !isstring(payload.key) ||
      payload.channel !== 'vm'
    ) {
      return
    }
    try {
      const vars = await storagereadvars()
      const value = vars[payload.key]
      vmpullvarresult(device, player, {
        id: payload.id,
        value,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'storagereadvars_failed'
      vmpullvarresult(device, player, {
        id: payload.id,
        error: msg,
      })
    }
  })
}

export function handletoken(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    vmplayertoken(device, message.player, message.data)
  }
}
