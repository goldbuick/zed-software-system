import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { applyagentsyncpayload } from 'zss/device/vm/agentshadow'

export function handleagentsync(_vm: DEVICE, message: MESSAGE): void {
  applyagentsyncpayload(message.data)
}
