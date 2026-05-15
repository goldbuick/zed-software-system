import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerbudgetack } from 'zss/device/vm/boardrunnermanagement'
import { isarray } from 'zss/mapping/types'

export function handleboardrunnerack(_vm: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    boardrunnerbudgetack(message.player, message.data)
  }
}
