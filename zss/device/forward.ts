import { MESSAGE } from 'zss/chip'
import { createdevice } from 'zss/device'
import { hub } from 'zss/hub'

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = new Set<string>()

  function forward(message: MESSAGE) {
    if (!syncids.has(message.id)) {
      syncids.add(message.id)
      hub.invoke(message)
    }
  }

  createdevice('forward', ['all'], (message) => {
    if (!syncids.has(message.id)) {
      syncids.add(message.id)
      handler(message)
    }
  })

  return forward
}
