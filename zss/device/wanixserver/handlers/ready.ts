import type { DEVICE } from 'zss/device'
import { wanixclientready } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'

export function handleready(wanix: DEVICE, message: MESSAGE): void {
  wanixclientready(wanix, message.player, { iframe: true })
}
