import type { MESSAGE } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'

/** Iframe/system emits with empty player. */
const WANIX_IFRAME_TARGETS = new Set([
  'requestzedcafestate',
  'cells',
  'session',
])

export function shouldprocesswanixclientmessage(message: MESSAGE): boolean {
  if (!message.player && WANIX_IFRAME_TARGETS.has(message.target)) {
    return true
  }
  return message.player === registerreadplayer()
}
