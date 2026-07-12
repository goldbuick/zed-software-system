import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { apierror } from 'zss/device/api'
import { resolvevmzedcafeimportwaiter } from 'zss/device/wanixclient/wanixzedcafe'
import { ispresent } from 'zss/mapping/types'

export function handleimportresult(device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (
    !ispresent(data) ||
    typeof data !== 'object' ||
    typeof (data as { ok?: unknown }).ok !== 'boolean'
  ) {
    apierror(
      device,
      message.player,
      'wanix',
      'zedcafe importresult payload rejected',
    )
    return
  }
  const payload = data as {
    ok: boolean
    changed?: boolean
    error?: string
    bookcount?: number
  }
  resolvevmzedcafeimportwaiter({
    ok: payload.ok,
    changed: !!payload.changed,
    error: typeof payload.error === 'string' ? payload.error : undefined,
    bookcount:
      typeof payload.bookcount === 'number' ? payload.bookcount : undefined,
  })
}
