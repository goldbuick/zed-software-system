import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handletermwrite(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : [message.data]
  runwanixhost(wanix, message, 'termwrite', () =>
    readhost().termwrite(
      args[0] != null ? String(args[0]) : undefined,
      args[1] != null ? String(args[1]) : undefined,
    ),
  )
}
