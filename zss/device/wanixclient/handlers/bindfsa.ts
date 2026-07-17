import type { DEVICE } from 'zss/device'
import { apilog, apitoast } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import type { MESSAGE } from 'zss/device/types'
import { recordwanixfsamount } from 'zss/device/wanixclient/wanixfsamounts'
import { ispresent } from 'zss/mapping/types'

function readbindfsaplayer(message: MESSAGE): string {
  if (typeof message.player === 'string' && message.player.length > 0) {
    return message.player
  }
  return registerreadplayer()
}

/** Iframe RESULT after folder FSA bind — parent log + toast. */
export function handlebindfsa(device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  const result = data as {
    ok?: unknown
    error?: unknown
    dst?: unknown
  }
  const player = readbindfsaplayer(message)
  if (result.ok === false) {
    const detail = typeof result.error === 'string' ? result.error : 'unknown'
    apilog(device, player, `wanix folder mount FAILED: ${detail}`)
    apitoast(device, player, `folder mount FAILED: ${detail}`)
    return
  }
  if (typeof result.dst === 'string') {
    recordwanixfsamount(result.dst)
    apilog(
      device,
      player,
      `wanix folder mount OK: ${result.dst} -- ready for #wanix zedsync ${result.dst}`,
    )
    apitoast(
      device,
      player,
      `folder mount OK: ${result.dst} -- try #wanix zedsync ${result.dst}`,
    )
  }
}
