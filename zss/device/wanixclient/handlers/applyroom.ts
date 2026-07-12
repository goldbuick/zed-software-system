import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { applywanixroomresult } from 'zss/device/wanixclient/wanixroom'

export function handleapplyroom(_device: DEVICE, message: MESSAGE): void {
  void message
  applywanixroomresult()
}
