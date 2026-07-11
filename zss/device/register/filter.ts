import type { MESSAGE } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'

const BROADCAST_TARGETS = new Set([
  'ready',
  'chat',
  'toast',
  'second',
  'workstatus',
  'sessionreset',
])

/** Iframe/system emits with empty player. */
const WANIX_IFRAME_TARGETS = new Set([
  'wanix:requestzedcafestate',
  'wanix:cells',
  'wanix:session',
])

export function shouldprocessregistermessage(message: MESSAGE): boolean {
  if (BROADCAST_TARGETS.has(message.target)) {
    return true
  }
  if (!message.player && WANIX_IFRAME_TARGETS.has(message.target)) {
    return true
  }
  return message.player === registerreadplayer()
}
