import type { DEVICE } from 'zss/device'
import { boardrunnergunsyncapply } from 'zss/device/api'

import {
  gunsyncbumpversion,
  gunsyncpayloadfromreplica,
  gunsynccapture,
} from './replica'

/** Push sim MEMORY snapshot to boardrunner after books load (no Gun / room mirror). */
export function afterbooksloadsynchydrate(
  vmdevice: DEVICE,
  player: string,
): void {
  const wirev = gunsyncbumpversion()
  const blob = gunsyncpayloadfromreplica(gunsynccapture(), wirev, 'sim')
  boardrunnergunsyncapply(vmdevice, player, blob)
}
