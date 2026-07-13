import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { applywanixroomresult } from 'zss/device/wanixclient/wanixroom'

export function handleapplyroom(device: DEVICE, message: MESSAGE): void {
  applywanixroomresult(device, message.player, message.data)
}
