import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { haltzedcafe } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlehaltzedcafe(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'haltzedcafe', () => haltzedcafe())
}
