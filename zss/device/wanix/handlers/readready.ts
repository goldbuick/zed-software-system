import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readready } from 'zss/device/wanix/runtime'

import { runwanixhost } from './hostutil'

export function handlereadready(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'readready', () => readready())
}
