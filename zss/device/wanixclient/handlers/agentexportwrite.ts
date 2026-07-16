import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { resolveagentexportwrite } from 'zss/feature/agent/agentio'

export function handleagentexportwrite(
  _device: DEVICE,
  message: MESSAGE,
): void {
  resolveagentexportwrite(message.data)
}
