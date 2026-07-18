import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { spawntask } from 'zss/device/wanixserver/runtime'
import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'

import { runwanixhost } from './hostutil'

export function handlespawntask(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  const stageurl = args[3]
  runwanixhost(wanix, message, 'spawntask', () =>
    spawntask(
      String(args[0] ?? ''),
      String(args[1] ?? ''),
      (args[2] as WanixTaskDriver | null | undefined) ?? undefined,
      typeof stageurl === 'string' && stageurl.length > 0
        ? stageurl
        : undefined,
    ),
  )
}
