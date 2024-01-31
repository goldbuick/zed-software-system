import { MESSAGE } from 'zss/system/chip'
import { createdevice } from 'zss/system/device'
import { hub } from 'zss/system/hub'

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
