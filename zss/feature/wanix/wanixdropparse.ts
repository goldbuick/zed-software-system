import { apierror, apilog, wanixdrop } from 'zss/device/api'
import { isdevbuild } from 'zss/feature/devbuild'
import type { DEVICELIKE } from 'zss/device/api'
import type { WanixDropPayload } from 'zss/feature/wanix/wanixroomtypes'

export function iswanixgzipmagic(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

export function iswanixdropfilename(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.endsWith('.wasm') ||
    lower.endsWith('.tgz') ||
    lower.endsWith('.tar.gz')
  )
}

export function readwanixdropkind(filename: string): 'wasm' | 'bundle' {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.wasm')) {
    return 'wasm'
  }
  return 'bundle'
}

export async function parsewanixdropfile(
  file: File,
): Promise<WanixDropPayload> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = readwanixdropkind(file.name)
  return { label: file.name, kind, bytes }
}

export function emitwanixdropfile(
  device: DEVICELIKE,
  player: string,
  file: File,
): void {
  void parsewanixdropfile(file)
    .then((payload) => {
      if (isdevbuild()) {
        apilog(
          device,
          player,
          `wanix drop parse: kind=${payload.kind} bytes=${payload.bytes.length} label=${payload.label}`,
        )
      }
      wanixdrop(device, player, payload)
    })
    .catch((err) =>
      apierror(
        device,
        player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      ),
    )
}
