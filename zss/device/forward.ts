import { createdevice } from 'zss/device'
import { hub } from 'zss/hub'

import { ismessage, MESSAGE } from './api'

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = new Set<string>()

  function forward(message: any) {
    if (
      ismessage(message) &&
      message.target !== 'tick' &&
      message.target !== 'tock' &&
      syncids.has(message.id) === false
    ) {
      syncids.add(message.id)
      hub.invoke(message)
    }
  }

  const device = createdevice('forward', ['all'], (message) => {
    if (!syncids.has(message.id)) {
      syncids.add(message.id)
      handler(message)
    }
  })

  function disconnect() {
    hub.disconnect(device)
  }

  return { forward, disconnect }
}

// create server -> client forward
export function forwardservertoclient(message: MESSAGE) {
  //
}

// create server -> client forward
export function forwardclienttoserver(message: MESSAGE) {
  //
}
