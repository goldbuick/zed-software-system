import { DEVICE } from 'zss/device'
import { MESSAGE } from 'zss/device/api'
import { TICK_FPS } from 'zss/mapping/tick'

import { boardrunneracks } from '../state'

export function handleacktick(_vm: DEVICE, message: MESSAGE) {
  boardrunneracks[message.player] = Math.ceil(TICK_FPS)
}
