import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { registerreadplayer } from 'zss/device/registerplayer'
import { handlewanixexportready } from 'zss/device/wanixclient/wanixzedcafe'
import { ispresent } from 'zss/mapping/types'
import { memoryreadoperator } from 'zss/memory/session'

export function handleexportready(device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  const payload = data as { taskrid?: unknown; event?: unknown }
  if (typeof payload.taskrid !== 'string') {
    return
  }
  const player =
    message.player || registerreadplayer() || memoryreadoperator()
  handlewanixexportready(
    device,
    player,
    payload.taskrid,
    typeof payload.event === 'string' ? payload.event : undefined,
  )
}
