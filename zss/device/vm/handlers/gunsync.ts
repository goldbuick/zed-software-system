import type { DEVICE } from 'zss/device'
import type { GunsyncPayload } from 'zss/feature/gunsync/replica'
import { gunsyncapplyfromwire } from 'zss/feature/gunsync/replica'

import type { MESSAGE } from 'zss/device/api'

export function handlegunsync(_vm: DEVICE, message: MESSAGE): void {
  gunsyncapplyfromwire(message.data as GunsyncPayload)
}
