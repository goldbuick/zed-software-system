import { createdevice } from 'zss/device'
import { ispresent } from 'zss/mapping/types'

import { platform_started } from './api'

let defaultplayer = ''

const peer = createdevice('peer', ['init', 'second'], (message) => {
  switch (message.target) {
    case 'init':
      if (ispresent(message.player)) {
        defaultplayer = message.player
        // ack
        peer.reply(message, 'ackinit', true, message.player)
      }
      break
    case 'host':
      break
    case 'join':
      break
    case 'second': {
      //
      break
    }
  }
})

export function started() {
  // signal ready state
  platform_started(peer.name(), defaultplayer)
}
