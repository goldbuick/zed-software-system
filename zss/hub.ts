import { MESSAGE } from './chip'
import { DEVICE, createmessage } from './device'

export type HUB_MESSAGE = {
  id: string
  message: MESSAGE
}

export type HUB = {
  emit: (
    session: string,
    target: string,
    sender: string,
    data?: any,
    player?: string,
  ) => void
  invoke: (message: MESSAGE) => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
}

const devices = new Set<DEVICE>()

export const hub: HUB = {
  emit(session, target, sender, data, player) {
    hub.invoke(createmessage(session, target, sender, data, player))
  },
  invoke(message) {
    switch (message.target) {
      case 'tick':
        break
      case 'tock':
        break
      default:
        console.info(message)
        break
    }
    devices.forEach((device) => device.handle(message))
  },
  connect(device) {
    devices.add(device)
  },
  disconnect(device) {
    devices.delete(device)
  },
}
