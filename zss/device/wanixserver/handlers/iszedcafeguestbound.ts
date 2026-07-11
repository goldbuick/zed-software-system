import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { iszedcafeguestbound } from 'zss/device/wanixserver/runtime'

import { runwanixhost } from './hostutil'

export function handleiszedcafeguestbound(
  wanix: DEVICE,
  message: MESSAGE,
): void {
  runwanixhost(wanix, message, 'iszedcafeguestbound', () =>
    iszedcafeguestbound(),
  )
}
