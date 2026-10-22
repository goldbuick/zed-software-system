import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { isarray } from 'zss/mapping/types'
import { memorywritesessionlist } from 'zss/memory/sessionlist'

export function handlesessionlist(_vm: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    memorywritesessionlist(message.data)
  }
}
