import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { drop } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handledrop(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  const label = String(args[0] ?? '')
  const kind = args[1] === 'bundle' ? 'bundle' : 'wasm'
  const bytes = args[2]
  runwanixhost(wanix, message, 'dropdone', () => {
    if (!(bytes instanceof Uint8Array)) {
      throw new Error('drop bytes invalid')
    }
    return drop(label, kind, bytes)
  })
}
