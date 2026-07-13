import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { setzedcafeready } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlesetzedcafeready(wanix: DEVICE, message: MESSAGE): void {
  const ready = !!(Array.isArray(message.data) ? message.data[0] : message.data)
  runwanixhost(
    wanix,
    message,
    'setzedcafeready',
    () => setzedcafeready(ready),
    { reply: false },
  )
}
