import { createdevice } from 'zss/device'

import { vm_doot, vm_login } from './api'
import { gadgetstategetplayer, gadgetstatesetplayer } from './gadgetclient'

// simple bootstrap manager

const bip = createdevice(
  'bip',
  ['second', 'ready', 'error', 'memset'],
  (message) => {
    // ??
    console.info(message)

    switch (message.target) {
      case 'second': {
        const player = gadgetstategetplayer()
        if (player) {
          vm_doot(bip.name(), player)
        }
        break
      }
      case 'ready':
        if (message.player) {
          if (gadgetstatesetplayer(message.player)) {
            vm_login(bip.name(), message.player)
          }
        }
        break
      case 'error':
        if (message.player) {
          switch (message.data) {
            case 'with login':
              // issue reboot
              break
          }
        }
        break
      case 'memset':
        if (message.player) {
          //
        }
    }
  },
)
