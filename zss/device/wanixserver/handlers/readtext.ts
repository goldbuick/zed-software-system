import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readtext } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlereadtext(wanix: DEVICE, message: MESSAGE): void {
  const path = String(
    Array.isArray(message.data) ? message.data[0] : (message.data ?? ''),
  )
  runwanixhost(wanix, message, 'readtext', () => readtext(path))
}
