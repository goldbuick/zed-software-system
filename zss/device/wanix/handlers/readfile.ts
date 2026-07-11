import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readfile } from 'zss/device/wanix/runtime'

import { runwanixhost } from './hostutil'

export function handlereadfile(wanix: DEVICE, message: MESSAGE): void {
  const path = String(
    Array.isArray(message.data) ? message.data[0] : (message.data ?? ''),
  )
  runwanixhost(wanix, message, 'readfile', () => readfile(path))
}
