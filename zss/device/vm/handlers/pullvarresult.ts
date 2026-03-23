import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { resolvestoragepullmessage } from 'zss/feature/storagepull'

export function handlepullvarresult(_vm: DEVICE, message: MESSAGE): void {
  resolvestoragepullmessage(message.data)
}
