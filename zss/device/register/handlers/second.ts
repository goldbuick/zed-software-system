import type { DEVICE } from 'zss/device'
import { vmdoot } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import {
  DOOT_RATE,
  deckeepaliveby,
  inckeepalive,
  readloggedin,
} from 'zss/device/register/state'
import { registerreadplayer } from 'zss/device/registerplayer'

export function handlesecond(device: DEVICE, message: MESSAGE): void {
  void message
  const keepalive = inckeepalive()
  if (keepalive >= DOOT_RATE) {
    deckeepaliveby(DOOT_RATE)
    if (readloggedin()) {
      vmdoot(device, registerreadplayer())
    }
  }
}
