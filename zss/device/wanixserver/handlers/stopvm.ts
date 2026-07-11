import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { stopvm } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlestopvm(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'stopvm', () => stopvm())
}
