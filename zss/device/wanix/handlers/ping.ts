import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handleping(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'ping', () => readhost().ping())
}
