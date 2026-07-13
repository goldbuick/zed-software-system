import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { readroomstatus } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlereadroomstatus(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'readroomstatus', () => readroomstatus())
}
