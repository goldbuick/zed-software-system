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
      case 'tock':
      case 'vm:doot':
      case 'second':
      case 'tape:info':
      case 'tape:debug':
        break
      default:
        // console.info(message.player, message.target, message.data)
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
