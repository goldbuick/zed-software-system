import type { DEVICE } from 'zss/device'
import { apilog } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { tryattachwanixsession } from 'zss/device/wanixclient/wanixdisplay'
import { isstring } from 'zss/mapping/types'

/** Main-thread attach — sim `#wanix attach` must not use the worker store. */
export function handleattachsession(device: DEVICE, message: MESSAGE): void {
  const raw = message.data
  const requested = isstring(raw) ? raw : ''
  const result = tryattachwanixsession(requested || null)
  if (!result.ok) {
    apilog(device, message.player, result.errormsg)
    return
  }
  apilog(device, message.player, `wanix attached ${result.sessionkey}`)
}
