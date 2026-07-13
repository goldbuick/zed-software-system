import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { kickzedcafepoll } from 'zss/device/wanixclient/wanixzedcafe'

/** Iframe RESULT — guest export FS dirty; kick import cycle. */
export function handlezedcafefilechange(_device: DEVICE, _message: MESSAGE): void {
  kickzedcafepoll('file-change')
}
