import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import { readhost, runwanixhost } from './hostutil'

export function handlespawntask(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(wanix, message, 'spawntask', () =>
    readhost().spawntask(
      String(args[0] ?? ''),
      String(args[1] ?? ''),
      (args[2] as WanixTaskDriver | null | undefined) ?? undefined,
    ),
  )
}
