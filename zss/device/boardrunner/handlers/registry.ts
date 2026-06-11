import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

import { handleboardrunnerdefault } from './default'
import { handleidle } from './idle'
import { handleinput } from './input'
import { handlelinkdead } from './linkdead'
import { handlepaint } from './paint'
import { handlepatch } from './patch'
import { handlestart } from './start'
import { handletick } from './tick'

export type BOARDRUNNER_HANDLER = (device: DEVICE, message: MESSAGE) => void

export const boardrunnerhandlers: Record<string, BOARDRUNNER_HANDLER> = {
  start: handlestart,
  input: handleinput,
  idle: handleidle,
  linkdead: handlelinkdead,
  tick: handletick,
  paint: handlepaint,
  patch: handlepatch,
}

export { handleboardrunnerdefault }
