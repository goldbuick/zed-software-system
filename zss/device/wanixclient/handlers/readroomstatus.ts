import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { applywanixroomstatus } from 'zss/device/wanixclient/wanixroom'

export function handlereadroomstatus(_device: DEVICE, message: MESSAGE): void {
  applywanixroomstatus(message.data)
}
