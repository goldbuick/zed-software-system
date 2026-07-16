import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { agentexporttree } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handleagentexporttree(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'agentexporttree', () => agentexporttree())
}
