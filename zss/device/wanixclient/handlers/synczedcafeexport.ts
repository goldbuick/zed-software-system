import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { registerreadplayer } from 'zss/device/registerplayer'
import { applyzedcafesyncresult } from 'zss/device/wanixclient/wanixzedcafe'
import { memoryreadoperator } from 'zss/memory/session'

export function handlesynczedcafeexport(
  device: DEVICE,
  message: MESSAGE,
): void {
  const player =
    message.player || registerreadplayer() || memoryreadoperator()
  applyzedcafesyncresult(device, player, message.data)
}
