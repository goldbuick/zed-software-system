import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { iszedcafeexportlive } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handleiszedcafeexportlive(
  wanix: DEVICE,
  message: MESSAGE,
): void {
  const taskrid = Array.isArray(message.data)
    ? message.data[0] != null
      ? String(message.data[0])
      : undefined
    : undefined
  runwanixhost(wanix, message, 'iszedcafeexportlive', () =>
    iszedcafeexportlive(taskrid),
  )
}
