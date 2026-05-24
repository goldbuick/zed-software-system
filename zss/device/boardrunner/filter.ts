import type { MESSAGE } from 'zss/device/api'
import { memoryreadboardrunner } from 'zss/memory/session'

const PLAYERSCOPED_TARGETS = new Set([
  'idle',
  'tick',
  'paint',
  'patch',
  'linkdead',
])

export function shouldprocessboardrunnermessage(message: MESSAGE): boolean {
  if (!PLAYERSCOPED_TARGETS.has(message.target)) {
    return true
  }
  return message.player === memoryreadboardrunner()
}
