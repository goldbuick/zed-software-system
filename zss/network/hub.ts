import { createGuid } from '../mapping/guid'

import { DEVICE, MESSAGE } from './device'

export type HUB_MESSAGE = {
  id: string
  message: MESSAGE
}

export type HUB = {
  emit: (message: MESSAGE) => void
  handle: (message: MESSAGE) => void
  sync: (hubmessage: HUB_MESSAGE) => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
}

const syncIds = new Set<string>()
const devices = new Set<DEVICE>()

export const hub: HUB = {
  emit(message) {
    hub.handle(message)
    hub.sync({ id: createGuid(), message })
  },
  handle(message) {
    devices.forEach((device) => device.handle(message))
  },
  sync(hubmessage) {
    // so we do not endlessly sync
    if (syncIds.has(hubmessage.id)) {
      return
    }
  },
  connect(device) {
    devices.add(device)
  },
  disconnect(device) {
    devices.delete(device)
  },
}
