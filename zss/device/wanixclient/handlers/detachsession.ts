import type { DEVICE } from 'zss/device'
import { apilog } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { detachwanixterm } from 'zss/device/wanixclient/wanixdisplay'

/** Main-thread detach — sim `#wanix detach` must not use the worker store. */
export function handledetachsession(device: DEVICE, message: MESSAGE): void {
  detachwanixterm()
  apilog(device, message.player, 'wanix detached')
}
