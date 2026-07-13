import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/messagetypes'
import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { ispresent } from 'zss/mapping/types'

/** Print-only: iframe owns menu tape; do not write display state. */
export function handlemenu(_device: DEVICE, message: MESSAGE): void {
  const data = message.data
  if (!ispresent(data) || typeof data !== 'object') {
    return
  }
  if ((data as { ok?: unknown }).ok === false) {
    return
  }
  const tape = (data as { tape?: unknown }).tape
  if (typeof tape !== 'string' || !tape) {
    return
  }
  terminalwritelines(SOFTWARE, message.player, tape)
}
