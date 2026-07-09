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

export function shouldprocessregistermessage(message: MESSAGE): boolean {
  if (BROADCAST_TARGETS.has(message.target)) {
    return true
  }
  return message.player === registerreadplayer()
}
