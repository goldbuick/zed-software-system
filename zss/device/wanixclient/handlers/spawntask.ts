import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { applywanixtaskspawnresult } from 'zss/device/wanixclient/wanixroom'

export function handlespawntask(_device: DEVICE, message: MESSAGE): void {
  applywanixtaskspawnresult(message.data)
}
