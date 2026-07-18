import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applywanixsessionmessage } from 'zss/device/wanixclient/wanixdisplay'
import { ispresent } from 'zss/mapping/types'

export function handlewanixsession(_device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  applywanixsessionmessage(
    data as { event?: unknown; sessionkey?: unknown; kind?: unknown },
  )
}
