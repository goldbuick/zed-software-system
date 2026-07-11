import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { termwrite } from 'zss/device/wanix/runtime'

import { runwanixhost } from './hostutil'

export function handletermwrite(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : [message.data]
  runwanixhost(wanix, message, 'termwrite', () =>
    termwrite(
      args[0] != null ? String(args[0]) : undefined,
      args[1] != null ? String(args[1]) : undefined,
    ),
  )
}
