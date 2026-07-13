import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applyzedsyncreadfileresult } from 'zss/device/wanixclient/wanixzedsync'

export function handlereadfile(_device: DEVICE, message: MESSAGE): void {
  applyzedsyncreadfileresult(message.data)
}
