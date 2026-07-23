import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import {
  applywanixtermread,
  readwanixtermbuffer,
} from 'zss/device/wanixclient/wanixtermbuffer'
import { mirrorzedsynctermlines } from 'zss/device/wanixclient/wanixzedsyncready'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import { ispresent } from 'zss/mapping/types'

export function handlewanixcells(_device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  const payload = data as {
    sessionkey?: unknown
    snapshot?: WanixTermCellsSnapshot
  }
  if (
    typeof payload.sessionkey !== 'string' ||
    !payload.snapshot ||
    typeof payload.snapshot !== 'object'
  ) {
    return
  }
  applywanixtermread(payload.sessionkey, payload.snapshot)
  const buffer = readwanixtermbuffer(payload.sessionkey)
  if (buffer) {
    mirrorzedsynctermlines(payload.sessionkey, buffer)
  }
}
