import { DEVICE, createmessage, parsetarget } from './device'
import { MESSAGE } from './device/api'
import { NAME } from './words/types'

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

function hubshouldbroadcastsession(message: MESSAGE): boolean {
  const { target } = parsetarget(message.target)
  const itarget = NAME(target)
  return itarget === NAME('sessionreset') || itarget === NAME('ready')
}

function devicemessagedelivers(device: DEVICE, message: MESSAGE): boolean {
  const { target } = parsetarget(message.target)
  const itarget = NAME(target)
  const itopics = device.topics().map((t) => NAME(t))
  const topicmatch =
    itopics.findIndex((tag) => tag === NAME('all') || tag === itarget) !== -1
  const iname = NAME(device.name())
  const direct =
    device.id() === target || NAME('all') === itarget || iname === itarget
  return topicmatch || direct
}

export const hub: HUB = {
  emit(session, player, sender, target, data) {
    hub.invoke(createmessage(session, player, sender, target, data))
  },
  invoke(message) {
    if (hubshouldbroadcastsession(message)) {
      devices.forEach((device) => device.handle(message))
      return
    }
    devices.forEach((device) => {
      if (devicemessagedelivers(device, message)) {
        device.handle(message)
      }
    })
  },
  connect(device) {
    devices.add(device)
  },
  disconnect(device) {
    devices.delete(device)
  },
}
