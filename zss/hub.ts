import { DEVICE, createmessage } from './device'
import { MESSAGE } from './device/api'

export type HUB_MESSAGE = {
  id: string
  message: MESSAGE
}

export type HUB = {
  emit: (
    session: string,
    player: string,
    sender: string,
    target: string,
    data?: any,
  ) => void
  invoke: (message: MESSAGE) => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
}

const devices = new Set<DEVICE>()

export const hub: HUB = {
  emit(session, player, sender, target, data) {
    hub.invoke(createmessage(session, player, sender, target, data))
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
