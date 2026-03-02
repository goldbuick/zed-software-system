import { MESSAGE } from './device/api'
import { hub } from './hub'
import { createsid } from './mapping/guid'
import { parsetarget } from './mapping/string'
import { ispresent, noop } from './mapping/types'
import { NAME } from './words/types'

export function createmessage(
  session: string,
  player: string,
  sender: string,
  target: string,
  data?: any,
): MESSAGE {
  return { session, player, id: createsid(), sender, target, data }
}

export type MESSAGE_FUNC = (message: MESSAGE) => void

export type DEVICE = {
  id: () => string
  name: () => string
  session: (check?: MESSAGE) => string
  topics: () => string[]
  emit: (player: string, target: string, data?: any) => void
  reply: (to: MESSAGE, target: string, data?: any) => void
  replynext: (to: MESSAGE, target: string, data?: any) => void
  handle: MESSAGE_FUNC
  disconnect: () => void
}

export { parsetarget }

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
    emit(player, target, data) {
      hub.emit(session, player, id, target, data)
    },
    reply(to, target, data) {
      device.emit(to.player, `${to.sender}:${target}`, data)
    },
    replynext(to, target, data) {
      setTimeout(
        () => device.emit(to.player, `${to.sender}:${target}`, data),
        64,
      )
    },
    handle(message) {
      const { target, path } = parsetarget(message.target)
      const itarget = NAME(target)
      const ipath = NAME(path)

      // Broadcast: no colon means target is 'self' and path is the topic (e.g. "ready", "second")
      const broadcasttopic = itarget === 'self' && path ? ipath : itarget

      // we snag ready internally to save the session
      if (!session && (itarget === 'ready' || broadcasttopic === 'ready')) {
        session = message.session
      }

      // we got a reset
      if (itarget === 'sessionreset' || broadcasttopic === 'sessionreset') {
        session = ''
      }

      // we match by topics (broadcast "ready"/"second" etc. or directed target)
      if (
        itopics.findIndex(
          (tag) => tag === 'all' || tag === itarget || tag === broadcasttopic,
        ) !== -1
      ) {
        onMessage(message)
      }

      // we match by id, all, name
      if (id === target || 'all' === itarget || iname === itarget) {
        onMessage({ ...message, target: path })
      }
    },
    disconnect() {
      hub.disconnect(device)
    },
  }

  hub.connect(device)

  return device
}
