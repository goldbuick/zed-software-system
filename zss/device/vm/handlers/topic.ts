import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'
import { memorywritetopic } from 'zss/memory/session'

export function handleTopic(_vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    memorywritetopic(message.data)
  }
}
