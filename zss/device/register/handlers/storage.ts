import type { DEVICE } from 'zss/device'
import { vmplayertoken } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/messagetypes'
import { isstring } from 'zss/mapping/types'

export function handletoken(device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    vmplayertoken(device, message.player, message.data)
  }
}
