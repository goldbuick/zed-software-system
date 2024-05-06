import { MESSAGE } from './chip'
import { DEVICE, createmessage } from './device'

export type HUB_MESSAGE = {
  id: string
  message: MESSAGE
}

export type HUB = {
  emit: (target: string, sender: string, data?: any, player?: string) => void
  invoke: (message: MESSAGE) => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
}

const devices = new Set<DEVICE>()

export const hub: HUB = {
  emit(target, sender, data, player) {
    // console.info(target, sender, data, player)
    hub.invoke(createmessage(target, sender, data, player))
  },
  invoke(message) {
    devices.forEach((device) => device.handle(message))
  },
  connect(device) {
    devices.add(device)
  },
  disconnect(device) {
    devices.delete(device)
  },
}
