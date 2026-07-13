import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { ping } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handleping(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'ping', () => ping())
}
