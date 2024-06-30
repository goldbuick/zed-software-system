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
  tags: () => string[]
  emit: (target: string, data?: any, player?: string) => void
  reply: (to: MESSAGE, target: string, data?: any, player?: string) => void
  handle: MESSAGE_FUNC
}

export function parsetarget(targetString: string) {
  const [target, ...path] = targetString.split(':')
  // switch (target) {
  //   case 'tick':
  //   case 'tock':
  //   case 'modem':
  //   case 'second':
  //   case 'gadgetclient':
  //     break
  //   default:
  //     console.info('eee', target, path.join(':'))
  //     break
  // }
  return { target, path: path.join(':') }
}

export function createdevice(
  name: string,
  tags: string[],
  onMessage: MESSAGE_FUNC,
) {
  const id = createsid()
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
    reply(to, target, data, player) {
      device.emit(`${to.sender}:${target}`, data, player)
    },
    handle(message) {
      const { target, path } = parsetarget(message.target)
      const itarget = target.toLowerCase()

      // switch (itarget) {
      //   case 'tick':
      //   case 'tock':
      //   case 'modem':
      //   case 'second':
      //   case 'gadgetclient':
      //     break
      //   default:
      //     console.info('XXXX', { target, path, itarget, iname })
      //     break
      // }

      // we match by tags
      if (itags.findIndex((tag) => tag === 'all' || tag === itarget) !== -1) {
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
