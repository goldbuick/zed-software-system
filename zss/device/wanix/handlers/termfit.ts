import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handletermfit(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(wanix, message, 'termfit', () =>
    readhost().termfit(Number(args[0]), Number(args[1])),
  )
}
