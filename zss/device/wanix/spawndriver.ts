import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'
import { readwanixwasmdriver } from 'zss/feature/wanix/wanixwasmdriver'

export function resolvedriverforwasm(
  cmd: string,
  driverhint: WanixTaskDriver | null | undefined,
  ramfsbytes: Uint8Array | null | undefined,
): WanixTaskDriver {
  if (driverhint) {
    return driverhint
  }
  if (!ramfsbytes) {
    throw new Error(`wanix wasm driver: missing ramfs bytes for cmd=${cmd}`)
  }
  return readwanixwasmdriver(ramfsbytes)
}
