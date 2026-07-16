import type { MESSAGE } from 'zss/device/types'
import { registerreadplayer } from 'zss/device/registerplayer'

/** Iframe emits with empty player — allow these wanixclient paths through. */
const WANIX_IFRAME_TARGETS = new Set([
  'ready',
  'idle',
  'exportready',
  'requestzedcafestate',
  'cells',
  'session',
  'ping',
  'menu',
  'applyroom',
  'spawntask',
  'binddrop',
  'dropdone',
  'synczedcafeexport',
  'readzedcafeexportfiles',
  'readzedcafetaskrid',
  'iszedcafeexportlive',
  'readfile',
  'zedcafefilechange',
  'agentexporttree',
  'agentexportwrite',
])

export function shouldprocesswanixclientmessage(message: MESSAGE): boolean {
  if (!message.player && WANIX_IFRAME_TARGETS.has(message.target)) {
    return true
  }
  return message.player === registerreadplayer()
}
