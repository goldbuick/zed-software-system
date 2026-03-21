import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { isstring } from 'zss/mapping/types'

export function handlelastinputtouch(_vm: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    lastinputtime[message.data] = Date.now()
  }
}
