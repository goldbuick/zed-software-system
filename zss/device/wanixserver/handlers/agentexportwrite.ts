import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { agentexportwrite } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handleagentexportwrite(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(wanix, message, 'agentexportwrite', () =>
    agentexportwrite(String(args[0] ?? ''), args[1] as number[] | undefined),
  )
}
