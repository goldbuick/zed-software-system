import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { ispresent, isstring } from 'zss/mapping/types'

import { writewanixtermdump } from './wanixtermhandlers'

export function handletermdump(device: DEVICE, message: MESSAGE): void {
  const payload =
    ispresent(message.data) && typeof message.data === 'object'
      ? (message.data as { sessionkey?: unknown; tail?: unknown })
      : {}
  const sessionkey =
    isstring(payload.sessionkey) && payload.sessionkey.trim()
      ? payload.sessionkey.trim()
      : undefined
  const tail =
    typeof payload.tail === 'number' && payload.tail > 0
      ? Math.floor(payload.tail)
      : undefined
  writewanixtermdump(device, message.player, sessionkey, tail)
}
