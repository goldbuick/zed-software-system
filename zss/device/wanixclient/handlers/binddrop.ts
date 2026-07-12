import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { apierror } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import {
  readwanixbinddropdst,
  readwanixbinddropkind,
  readwanixbinddropperm,
} from 'zss/device/wanixclient/wanixbindpaths'
import { readattachedsession } from 'zss/device/wanixclient/wanixdisplay'
import { handlewanixbinddrop } from 'zss/device/wanixclient/wanixroom'
import { isarray, isstring } from 'zss/mapping/types'

export function handlebinddrop(device: DEVICE, message: MESSAGE): void {
  if (!isarray(message.data) || message.data.length < 2) {
    return
  }
  const [label, bytes] = message.data
  if (!isstring(label) || !(bytes instanceof Uint8Array)) {
    return
  }
  doasync(device, message.player, async () => {
    try {
      const sessionkey = readattachedsession()
      if (!sessionkey) {
        apierror(
          device,
          message.player,
          'wanix',
          'binddrop: no attached session',
        )
        return
      }
      const kind = readwanixbinddropkind(label)
      await handlewanixbinddrop(
        {
          label,
          kind,
          bytes,
          dst: readwanixbinddropdst(label, kind),
          perm: readwanixbinddropperm(label),
        },
        sessionkey,
      )
    } catch (err) {
      apierror(
        device,
        message.player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      )
    }
  })
}
