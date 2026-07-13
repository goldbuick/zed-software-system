import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { stoproom } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlestoproom(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'stoproom', () => stoproom(), { reply: false })
}
