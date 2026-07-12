import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { applywanixvmstatus } from 'zss/device/wanixclient/wanixroom'

export function handlereadvmstatus(_device: DEVICE, message: MESSAGE): void {
  applywanixvmstatus(message.data)
}
