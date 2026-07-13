import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { buildwanixmenureply } from 'zss/device/wanixserver/wanixmenu'

import { runwanixhost } from './hostutil'

export function handlemenu(wanix: DEVICE, message: MESSAGE): void {
  runwanixhost(wanix, message, 'menu', () => buildwanixmenureply())
}
