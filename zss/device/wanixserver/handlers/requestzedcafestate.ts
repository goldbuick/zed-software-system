import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { continuerequestzedcafestate } from 'zss/device/wanixserver/runtime'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

import { runwanixhost } from './hostutil'

export function handlerequestzedcafestate(
  wanix: DEVICE,
  message: MESSAGE,
): void {
  const files = (
    Array.isArray(message.data) ? message.data : message.data
  ) as WanixZedCafeGuestFile[]
  runwanixhost(wanix, message, 'synczedcafeexport', () =>
    continuerequestzedcafestate(Array.isArray(files) ? files : []),
  )
}
