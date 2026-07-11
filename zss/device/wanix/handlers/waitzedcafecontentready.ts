import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handlewaitzedcafecontentready(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(wanix, message, 'waitzedcafecontentready', () =>
    readhost().waitzedcafecontentready(
      String(args[0] ?? ''),
      typeof args[1] === 'number' ? args[1] : undefined,
    ),
  )
}
