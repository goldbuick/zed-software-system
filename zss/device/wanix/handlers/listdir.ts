import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handlelistdir(wanix: DEVICE, message: MESSAGE): void {
  const path = Array.isArray(message.data) ? String(message.data[0] ?? '.') : undefined
  runwanixhost(wanix, message, 'listdir', () => readhost().listdir(path))
}
