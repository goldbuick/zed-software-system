import type { DEVICE } from 'zss/device'
import {
  boardrunnergunsyncapply,
  gunsyncrelay,
} from 'zss/device/api'
import { MAYBE, ispresent } from 'zss/mapping/types'

import {
  type GunsyncPayload,
  gunsyncapplyfromwire,
  gunsyncbumpversion,
  gunsynccapture,
  gunsyncpayloadfromreplica,
} from './replica'
import { gunmeshmirrorreplica } from './roommirror'

export function boardrunneraftertickcapturerelay(
  device: DEVICE,
  player: string,
): void {
  const replica = gunsynccapture()
  const v = gunsyncbumpversion()
  const payload = gunsyncpayloadfromreplica(replica, v, 'boardrunner')
  gunmeshmirrorreplica(payload)
  gunsyncrelay(device, player, payload)
}

export function boardrunnerongunsyncmessage(data: MAYBE<GunsyncPayload>): void {
  gunsyncapplyfromwire(data)
}

export function gunmeshonmemory(
  vmdevice: DEVICE,
  player: string,
  data: GunsyncPayload,
): void {
  if (!ispresent(data)) {
    return
  }
  gunmeshmirrorreplica(data)
  const changed = gunsyncapplyfromwire(data)
  if (changed) {
    boardrunnergunsyncapply(vmdevice, player, data)
  }
}
