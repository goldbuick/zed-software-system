// these are all front-end devices
import './device/broadcast'
import './device/chat'
import './device/peer'
import './device/gadgetclient'
import './device/modem'
import './device/synth'
import './device/tape'

import { createdevice } from './device'
import { userinput_update } from './device/api'
import { registerreadplayer } from './device/register'

const userspace = createdevice('userspace', [], () => {})

function inputpolling() {
  const player = registerreadplayer()
  userinput_update(userspace, player)
  setTimeout(inputpolling, 10)
}

inputpolling()
