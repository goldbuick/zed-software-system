import { createGuid } from '../mapping/guid'

import { DEVICE, MESSAGE, createMessage } from './device'

export type HUB_MESSAGE = {
  id: string
  message: MESSAGE
}

type SYNC_HANDLER = (hubmessage: HUB_MESSAGE) => void

export type HUB = {
  emit: (target: string, data?: any) => void
  handle: (message: MESSAGE) => void
  sync: (hubmessage: HUB_MESSAGE) => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
  setSyncHandler: (handler: SYNC_HANDLER) => void
}

const syncIds = new Set<string>()
const devices = new Set<DEVICE>()

let syncHandler: SYNC_HANDLER | undefined

export const hub: HUB = {
  emit(target: string, data?: any) {
    hub.sync({ id: createGuid(), message: createMessage(target, data) })
  },
  handle(message) {
    devices.forEach((device) => device.handle(message))
  },
  sync(hubmessage) {
    // so we do not endlessly sync
    if (syncIds.has(hubmessage.id)) {
      return
    }
    syncIds.add(hubmessage.id)

    // handle message
    hub.handle(hubmessage.message)

    // forward it
    syncHandler?.(hubmessage)
  },
  connect(device) {
    devices.add(device)
  },
  disconnect(device) {
    devices.delete(device)
  },
  setSyncHandler(handler) {
    syncHandler = handler
  },
}
