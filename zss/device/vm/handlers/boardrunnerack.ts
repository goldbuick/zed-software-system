import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunneracks } from 'zss/device/vm/state'
import { TICK_FPS } from 'zss/mapping/tick'

const TICK_BUDGET = Math.ceil(TICK_FPS)

/** Worker processed `boardrunner:tick`; reset liveness budget for the runner. */
export function handleboardrunnerack(_vm: DEVICE, message: MESSAGE): void {
  boardrunneracks[message.player] = TICK_BUDGET
}
