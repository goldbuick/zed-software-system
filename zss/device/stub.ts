import { createdevice } from 'zss/device'
import { write } from 'zss/feature/writeui'
import { createsid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'

import { platform_ready } from './api'

let stuboperator = ''
const stubsession = createsid()

const stub = createdevice(
  'vm',
  [],
  (message) => {
    if (!stub.session(message)) {
      return
    }
    switch (message.target) {
      case 'operator':
        if (ispresent(message.player)) {
          stuboperator = message.player
          write(stub, `operator set to ${stuboperator}`)
          // ack
          stub.reply(message, 'ackoperator', true, message.player)
        }
        break
    }
  },
  stubsession,
)

export function started() {
  // signal ready state
  platform_ready(stub)
}
