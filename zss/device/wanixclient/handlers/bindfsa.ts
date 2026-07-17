import type { DEVICE } from 'zss/device'
import { apilog } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { ispresent } from 'zss/mapping/types'

/** Iframe RESULT after folder FSA bind — parent log. */
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
  if (result.ok === false) {
    const detail = typeof result.error === 'string' ? result.error : 'unknown'
    apilog(device, message.player, `wanix folder mount failed: ${detail}`)
    return
  }
  if (typeof result.dst === 'string') {
    apilog(device, message.player, `wanix folder mount ok $26 /${result.dst}`)
  }
}
