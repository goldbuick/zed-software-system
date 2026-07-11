import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ispresent } from 'zss/mapping/types'

import { applywanixsessionmessage } from './wanixdisplay'

export function handlewanixsession(_device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  applywanixsessionmessage(data as { event?: unknown; sessionkey?: unknown })
}
