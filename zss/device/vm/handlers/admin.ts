import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { lastinputtime } from 'zss/device/vm/state'
import { memoryadminmenu } from 'zss/memory/utilities'

export function handleadmin(_vm: DEVICE, message: MESSAGE): void {
  memoryadminmenu(message.player, lastinputtime)
}
