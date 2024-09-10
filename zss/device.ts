import { MESSAGE } from './chip'
import { hub } from './hub'
import { createsid } from './mapping/guid'

export function createmessage(
  target: string,
  sender: string,
  data?: any,
  player?: string,
): MESSAGE {
  return { id: createsid(), target, sender, data, player }
}

export type MESSAGE_FUNC = (message: MESSAGE) => void

export type DEVICE = {
  id: () => string
  name: () => string
  topics: () => string[]
  emit: (target: string, data?: any, player?: string) => void
  reply: (to: MESSAGE, target: string, data?: any, player?: string) => void
  handle: MESSAGE_FUNC
}

export function parsetarget(targetString: string) {
  const [target, ...path] = targetString.split(':')
  return { target, path: path.join(':') }
}

export function createdevice(
  name: string,
  topics: string[],
  onMessage: MESSAGE_FUNC,
) {
  const id = createsid()
  const iname = name.toLowerCase()
  const itopics = topics.map((tag) => tag.toLowerCase())

  const device: DEVICE = {
    id() {
      return id
    },
    name() {
      return name
    },
    topics() {
      return topics
    },
    emit(target, data, player) {
      hub.emit(target, id, data, player)
    },
    reply(to, target, data, player) {
      device.emit(`${to.sender}:${target}`, data, player)
    },
    handle(message) {
      const { target, path } = parsetarget(message.target)
      const itarget = target.toLowerCase()

      // we match by topics
      if (itopics.findIndex((tag) => tag === 'all' || tag === itarget) !== -1) {
        onMessage(message)
      }

      // we match by id, all, name
      if (id === target || 'all' === itarget || iname === itarget) {
        onMessage({ ...message, target: path })
      }
    },
  }

  hub.connect(device)

  return device
}
