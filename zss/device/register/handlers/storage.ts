import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { vmplayertoken } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'

export function handletoken(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    vmplayertoken(device, message.player, message.data)
  }
}
