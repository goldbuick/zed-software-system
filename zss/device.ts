import { MESSAGE } from './chip'
import { hub } from './hub'
import { createsid } from './mapping/guid'
import { ispresent, noop } from './mapping/types'
import { NAME } from './words/types'

export function createmessage(
  session: string,
  target: string,
  sender: string,
  data?: any,
  player?: string,
): MESSAGE {
  return { session, id: createsid(), target, sender, data, player }
}

export type MESSAGE_FUNC = (message: MESSAGE) => void

export type DEVICE = {
  id: () => string
  name: () => string
  session: (check?: MESSAGE) => string
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
  topics: string[] = [],
  onMessage: MESSAGE_FUNC = noop,
  withsession = '',
) {
  const id = createsid()
  const iname = NAME(name)
  const itopics = topics.map(NAME)
  // we have a session id we accept once
  let session = withsession

  const device: DEVICE = {
    id() {
      return id
    },
    name() {
      return name
    },
    session(check) {
      if (ispresent(check)) {
        return check.session === session ? check.session : ''
      }
      return session
    },
    topics() {
      return topics
    },
    emit(target, data, player) {
      hub.emit(session, target, id, data, player)
    },
    reply(to, target, data, player) {
      device.emit(`${to.sender}:${target}`, data, player)
    },
    handle(message) {
      const { target, path } = parsetarget(message.target)
      const itarget = NAME(target)

      // we snag ready internally to save the session
      if (!session && itarget === 'ready') {
        session = message.session
      }

      // we are bridging into a new session
      if (itarget === 'bridge' && ispresent(message.session)) {
        session = message.session
      }

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
