import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { termwrite } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handletermwrite(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : [message.data]
  runwanixhost(
    wanix,
    message,
    'termwrite',
    () =>
      termwrite(
        args[0] != null ? String(args[0]) : undefined,
        args[1] != null ? String(args[1]) : undefined,
      ),
    { reply: false },
  )
}
