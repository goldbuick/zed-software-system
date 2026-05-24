import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'
import { memorylogoutplayer } from 'zss/memory/playermanagement'

export function handlelinkdead(_device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    memorylogoutplayer(message.data, false)
  }
}
