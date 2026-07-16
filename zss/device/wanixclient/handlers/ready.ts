import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { markwanixready } from 'zss/device/wanixclient/wanixbridge'
import {
  ensurewanixtaskroom,
  readwanixroomconfig,
} from 'zss/device/wanixclient/wanixroom'

export function handleready(device: DEVICE, message: MESSAGE): void {
  markwanixready()
  const data =
    message.data && typeof message.data === 'object'
      ? (message.data as { iframe?: unknown })
      : undefined
  if (data?.iframe === true && readwanixroomconfig().mode === 'idle') {
    ensurewanixtaskroom(device, message.player)
  }
}
