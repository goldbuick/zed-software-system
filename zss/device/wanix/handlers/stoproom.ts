import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handlestoproom(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'stoproom', () => readhost().stoproom())
}
