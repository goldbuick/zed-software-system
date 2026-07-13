import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { boardrunnerbudgetack } from 'zss/device/vm/boardrunnermanagement'
export function handleboardrunnerack(_vm: DEVICE, message: MESSAGE): void {
  boardrunnerbudgetack(message.player)
}
