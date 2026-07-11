import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readroomstatus } from 'zss/device/wanix/runtime'

import { runwanixhost } from './hostutil'

export function handlereadroomstatus(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'readroomstatus', () => readroomstatus())
}
