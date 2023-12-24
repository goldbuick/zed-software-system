import { createGuid } from '../mapping/guid'
import { MESSAGE } from '../system/chip'

import { hub } from './hub'

export function createMessage(
  target: string,
  from: string,
  data?: any,
  player?: string,
): MESSAGE {
  return { target, from, data, player }
}

export type MESSAGE_FUNC = (message: MESSAGE) => void

export type DEVICE = {
  id: () => string
  name: () => string
  tags: () => string[]
  emit: (target: string, data?: any, player?: string) => void
  handle: MESSAGE_FUNC
}

export function parseTarget(targetString: string) {
  const [target, ...path] = targetString.split(':')
  return { target, path: path.join(':') }
}

export function createDevice(
  name: string,
  tags: string[],
  onMessage: MESSAGE_FUNC,
) {
  const id = createGuid()
  const iname = name.toLowerCase()
  const itags = tags.map((tag) => tag.toLowerCase())

  const device: DEVICE = {
    id() {
      return id
    },
    name() {
      return name
    },
    tags() {
      return tags
    },
    emit(target, data, player) {
      hub.emit(target, id, data, player)
    },
    handle(message) {
      const { target, path } = parseTarget(message.target)
      const itarget = target.toLowerCase()

      // we match by tags
      if (itags.findIndex((tag) => tag === itarget) !== -1) {
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
