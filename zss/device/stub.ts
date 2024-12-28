import { createdevice } from 'zss/device'
import { createpid } from 'zss/mapping/guid'

import { platform_started } from './api'

let defaultplayer = createpid()

const stub = createdevice('stub', ['init', 'second'], (message) => {
  switch (message.target) {
    case 'init':
      defaultplayer = (defaultplayer || message.player) ?? ''
      // ack
      stub.reply(message, 'ackinit', true, message.player)
      break
  }
})

export function started() {
  // signal ready state
  platform_started(stub.name(), defaultplayer)
}
