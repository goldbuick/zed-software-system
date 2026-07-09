import { apierror, apilog, wanixbinddrop } from 'zss/device/api'
import type { DEVICELIKE } from 'zss/device/api'
import { isdevbuild } from 'zss/feature/devbuild'
import { readattachedsession } from 'zss/feature/wanix/wanixattachstate'
import {
  readwanixbinddropdst,
  readwanixbinddropkind,
  readwanixbinddropperm,
} from 'zss/feature/wanix/wanixbindpaths'
import { iswanixgzipmagic } from 'zss/feature/wanix/wanixdropparse'
import { readwanixroomconfig } from 'zss/feature/wanix/wanixroom'
import type { WanixBindDropPayload } from 'zss/feature/wanix/wanixroomtypes'

export {
  readwanixbinddroparchivestem,
  readwanixbinddropbasename,
  readwanixbinddropdst,
  readwanixbinddropkind,
  readwanixbinddropperm,
} from 'zss/feature/wanix/wanixbindpaths'

export async function parsewanixbinddropfile(
  file: File,
): Promise<WanixBindDropPayload> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = readwanixbinddropkind(file.name)
  return {
    label: file.name,
    kind,
    bytes,
    dst: readwanixbinddropdst(file.name, kind),
    perm: readwanixbinddropperm(file.name),
  }
}

export function shouldroutebinddrop(): boolean {
  if (readattachedsession() == null) {
    return false
  }
  return readwanixroomconfig().mode !== 'idle'
}

export function emitwanixbinddropfile(
  device: DEVICELIKE,
  player: string,
  file: File,
): void {
  void parsewanixbinddropfile(file)
    .then((payload) => {
      if (isdevbuild()) {
        apilog(
          device,
          player,
          `wanix bind parse: kind=${payload.kind} bytes=${payload.bytes.length} dst=${payload.dst}`,
        )
      }
      wanixbinddrop(device, player, payload)
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

export async function routewanixattachedfiledrop(
  device: DEVICELIKE,
  player: string,
  file: File,
): Promise<'bind' | 'gzip-probe' | 'skip'> {
  if (!shouldroutebinddrop()) {
    return 'skip'
  }
  const type = file.type ?? ''
  if (type === 'application/gzip' || type === 'application/x-gzip') {
    const buffer = await file.slice(0, 2).arrayBuffer()
    if (iswanixgzipmagic(new Uint8Array(buffer))) {
      emitwanixbinddropfile(device, player, file)
      return 'bind'
    }
    return 'gzip-probe'
  }
  emitwanixbinddropfile(device, player, file)
  return 'bind'
}
