// these are all front-end devices
import './device/peer'
import './device/gadgetclient'
import './device/modem'
import './device/synth'
import './device/tape'
import { userinput_update } from './device/api'
import { registerreadplayer } from './device/register'

function inputpolling() {
  const player = registerreadplayer()
  userinput_update('userspace', player)
  setTimeout(inputpolling, 10)
}

inputpolling()
