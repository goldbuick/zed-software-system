import type { DEVICE } from 'zss/device'
import { apilog } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { ispresent } from 'zss/mapping/types'

/** Iframe RESULT after binddrop — updates parent display/logs. */
export function handlebinddrop(device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  const result = data as {
    ok?: unknown
    error?: unknown
    sessionkey?: unknown
    dst?: unknown
  }
  if (result.ok === false) {
    const detail = typeof result.error === 'string' ? result.error : 'unknown'
    apilog(device, message.player, `wanix binddrop failed: ${detail}`)
    return
  }
  if (typeof result.dst === 'string') {
    apilog(
      device,
      message.player,
      `wanix binddrop ok → ${result.dst}${
        typeof result.sessionkey === 'string' ? ` (${result.sessionkey})` : ''
      }`,
    )
  }
}
