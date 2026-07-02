import { apierror, wanixdrop } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'
import type { WanixDropPayload } from 'zss/feature/wanix/wanixroomtypes'

export function iswanixdropfilename(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.wasm') || lower.endsWith('.tgz')
}

export async function parsewanixdropfile(
  file: File,
): Promise<WanixDropPayload> {
  const kind = file.name.toLowerCase().endsWith('.tgz') ? 'bundle' : 'wasm'
  const bytes = new Uint8Array(await file.arrayBuffer())
  return { label: file.name, kind, bytes }
}

export function emitwanixdropfile(
  device: DEVICELIKE,
  player: string,
  file: File,
): void {
  void parsewanixdropfile(file)
    .then((payload) => wanixdrop(device, player, payload))
    .catch((err) =>
      apierror(
        device,
        player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      ),
    )
}
