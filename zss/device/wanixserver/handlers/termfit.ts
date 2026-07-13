import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { termfit } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handletermfit(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(
    wanix,
    message,
    'termfit',
    () => termfit(Number(args[0]), Number(args[1])),
    { reply: false },
  )
}
