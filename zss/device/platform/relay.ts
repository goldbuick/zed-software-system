import { MESSAGE } from 'zss/system/chip'
import { createdevice } from 'zss/system/device'

import '../shared'
import { forward } from './foward'

onmessage = function handleMessage(event) {
  forward(event.data as MESSAGE)
}

export const relaydevice = createdevice('relay', ['all'], forward)
