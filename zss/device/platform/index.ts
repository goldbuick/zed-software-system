import { MESSAGE } from 'zss/system/chip'
import { createdevice } from 'zss/system/device'

import '../shared'
import { forward } from './foward'

const relay = new Worker(new URL('./relay.ts', import.meta.url), {
  type: 'module',
})

relay.addEventListener('message', (event) => {
  forward(event.data as MESSAGE)
})

export const platformdevice = createdevice('platform', ['all'], forward)
