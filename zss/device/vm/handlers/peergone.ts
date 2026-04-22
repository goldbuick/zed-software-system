import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memorysyncdropplayerfromall } from 'zss/device/vm/memorysimsync'
import { isstring } from 'zss/mapping/types'

export function handlepeergone(_vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.player)) {
    // Drop the departed player from the shared memory stream too. If we don't,
    memorysyncdropplayerfromall(message.player)
  }
}
