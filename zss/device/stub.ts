import { createdevice } from 'zss/device'
import { createsid } from 'zss/mapping/guid'

import { platform_ready } from './api'

const session = createsid()

const stub = createdevice('stub', ['init', 'second'], (message) => {
  if (!stub.session(message)) {
    return
  }
  switch (message.target) {
    case 'init':
      // defaultplayer = (defaultplayer || message.player) ?? ''
      // // ack
      // stub.reply(message, 'ackinit', true, message.player)
      break
  }
})

export function started() {
  // signal ready state
  platform_ready(session)
}
