import type { DEVICE } from 'zss/device'
import { MAYBE } from 'zss/mapping/types'

import {
  gunsyncensureboardrunnerrelay,
} from './hubgunwire'
import { gunsyncreplicatograph } from './replicagraph'
import type { GunsyncPayload } from './replica'
import { gunsyncapplyfromwire, gunsynccapture } from './replica'

export function boardrunneraftertickcapturerelay(
  device: DEVICE,
  player: string,
): void {
  gunsyncensureboardrunnerrelay(device, player)
  gunsyncreplicatograph(gunsynccapture())
}

export function boardrunnerongunsyncmessage(
  data: MAYBE<GunsyncPayload>,
): void {
  gunsyncapplyfromwire(data)
}
