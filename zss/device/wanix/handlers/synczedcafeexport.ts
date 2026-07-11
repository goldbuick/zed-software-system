import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { readhost, runwanixhost } from './hostutil'

export function handlesynczedcafeexport(wanix: DEVICE, message: MESSAGE): void {
  const args = Array.isArray(message.data) ? message.data : []
  runwanixhost(wanix, message, 'synczedcafeexport', () =>
    readhost().synczedcafeexport(
      args[0] as { path: string; data: number[] }[] | null | undefined,
      args[1] as string[] | null | undefined,
    ),
  )
}
