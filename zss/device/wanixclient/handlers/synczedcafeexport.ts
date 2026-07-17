import type { DEVICE } from 'zss/device'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { applyzedcafesyncresult } from 'zss/device/wanixclient/wanixzedcafe'
import { memoryreadoperator } from 'zss/memory/session'

export function handlesynczedcafeexport(
  device: DEVICE,
  message: MESSAGE,
): void {
  const player = message.player || registerreadplayer() || memoryreadoperator()
  applyzedcafesyncresult(device, player, message.data)
}
