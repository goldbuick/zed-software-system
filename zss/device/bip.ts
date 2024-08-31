import { createdevice } from 'zss/device'

import { register_reboot, tape_crash, vm_doot, vm_init, vm_login } from './api'
import { gadgetstategetplayer, gadgetstatesetplayer } from './gadgetclient'

// simple bootstrap manager
let keepalive = 0

// send keepalive message every 24 seconds
const signalrate = 1

const bip = createdevice('bip', ['second', 'ready'], (message) => {
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
        const player = localStorage.getItem('node') ?? message.player
        if (gadgetstatesetplayer(player)) {
          vm_init(bip.name(), player)
          vm_login(bip.name(), player)
          localStorage.setItem('node', player)
        }
      }
      break
    case 'retry':
      if (message.player) {
        vm_login(bip.name(), message.player)
      }
      break
    case 'loginfailed':
      if (message.player) {
        const { player } = message
        register_reboot(bip.name(), player)
      }
      break
    case 'rebootfailed':
      if (message.player) {
        tape_crash(bip.name())
      }
      break
    case 'nodetrash':
      if (message.player) {
        localStorage.removeItem('node')
      }
      break
  }
})
