import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { applywanixtermread } from 'zss/device/wanixclient/wanixtermbuffer'
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
}
