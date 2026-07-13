import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { readzedcafeexportfiles } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlereadzedcafeexportfiles(
  wanix: DEVICE,
  message: MESSAGE,
): void {
  runwanixhost(wanix, message, 'readzedcafeexportfiles', () =>
    readzedcafeexportfiles(),
  )
}
