import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { tapeeditorclear } from 'zss/device/vm/tapeeditormirror'

export function handletapeeditorclose(_vm: DEVICE, message: MESSAGE): void {
  tapeeditorclear(message.player)
}
