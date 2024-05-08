import { createdevice } from 'zss/device'

import { register_reboot, tape_open, vm_doot, vm_login } from './api'
import { gadgetstategetplayer, gadgetstatesetplayer } from './gadgetclient'

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 24 seconds
const signalrate = 24

const bip = createdevice(
  'bip',
  ['second', 'ready', 'error', 'memset'],
  (message) => {
    console.info(message)
    switch (message.target) {
      case 'second':
        ++keepalive
        if (keepalive >= signalrate) {
          keepalive -= signalrate
          const player = gadgetstategetplayer()
          if (player) {
            vm_doot(bip.name(), player)
          }
        }
        break
      case 'ready':
        if (message.player) {
          if (gadgetstatesetplayer(message.player)) {
            vm_login(bip.name(), message.player)
          }
        }
        break
      case 'error:login':
        if (message.player) {
          register_reboot(bip.name(), message.player)
        }
        break
      case 'error:reboot':
        if (message.player) {
          tape_open(bip.name(), 1)
        }
        break
      case 'ackmem':
        if (message.player) {
          vm_login(bip.name(), message.player)
        }
    }
  },
)
