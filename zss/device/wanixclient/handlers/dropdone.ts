import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { apilog } from 'zss/device/api'
import { applywanixdropdone } from 'zss/device/wanixclient/wanixroom'
import { ispresent } from 'zss/mapping/types'

export function handledropdone(device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  const result = data as {
    ok?: unknown
    error?: unknown
    taskid?: unknown
    cmd?: unknown
    spawns?: unknown
  }
  if (result.ok === false) {
    const detail = typeof result.error === 'string' ? result.error : 'unknown'
    apilog(device, message.player, `wanix drop failed: ${detail}`)
    return
  }
  applywanixdropdone(device, message.player, result)
}
