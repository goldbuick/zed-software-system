import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { writewanixtermstatus } from 'zss/feature/wanix/wanixtermhandlers'

export function handletermstatus(device: DEVICE, message: MESSAGE): void {
  writewanixtermstatus(device, message.player)
}
