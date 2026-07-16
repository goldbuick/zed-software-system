import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { resolveagentexporttree } from 'zss/feature/agent/agentio'

export function handleagentexporttree(
  _device: DEVICE,
  message: MESSAGE,
): void {
  resolveagentexporttree(message.data)
}
