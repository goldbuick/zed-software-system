import type { DEVICE } from 'zss/device'

import {
  gunsyncapplyfromwire,
  gunsyncbumpversion,
  gunsyncpayloadfromreplica,
  gunsynccapture,
} from './replica'

/** After books load on sim VM: bump version and apply snapshot locally (single memory arena). */
export function afterbooksloadsynchydrate(
  _vmdevice: DEVICE,
  _player: string,
): void {
  const wirev = gunsyncbumpversion()
  const blob = gunsyncpayloadfromreplica(gunsynccapture(), wirev, 'sim')
  gunsyncapplyfromwire(blob)
}
