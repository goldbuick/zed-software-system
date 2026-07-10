import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'
import { memorywritewanixattached } from 'zss/memory/session'

export function handlewanixattach(_vm: DEVICE, message: MESSAGE): void {
  if (message.data === null || isstring(message.data)) {
    memorywritewanixattached(message.data)
  }
}
