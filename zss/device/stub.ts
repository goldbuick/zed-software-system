import { createdevice } from 'zss/device'
import { createsid } from 'zss/mapping/guid'

import { apilog, platformready } from './api'

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
        stuboperator = message.player
        apilog(stub, message.player, `operator set to ${stuboperator}`)
        // ack
        stub.reply(message, 'ackoperator', true)
        break
    }
  },
  stubsession,
)

export function started() {
  // signal ready state
  platformready(stub)
}
