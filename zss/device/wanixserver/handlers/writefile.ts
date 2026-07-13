import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { writefile } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handlewritefile(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(
    wanix,
    message,
    'writefile',
    () => writefile(String(args[0] ?? ''), args[1] as number[] | undefined),
    { reply: false },
  )
}
