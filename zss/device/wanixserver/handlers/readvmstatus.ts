import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { readvmstatus } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlereadvmstatus(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'readvmstatus', () => readvmstatus())
}
