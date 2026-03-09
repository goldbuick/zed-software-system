import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { memoryadminmenu } from 'zss/memory/utilities'

import { lastinputtime } from '../state'

export function handleAdmin(_vm: DEVICE, message: MESSAGE): void {
  memoryadminmenu(message.player, lastinputtime)
}
