import { createGuid } from '../mapping/guid'

export type MESSAGE_FUNC = (message: string, data: any) => void

export type DEVICE = {
  id: () => string
  name: () => string
  tags: () => string[]
  match: (target: string) => boolean
  send: MESSAGE_FUNC
}

export function parseMessage(message: string) {
  const [target, ...path] = message.split(':')
  return { target, path: path.join(':') }
}

export function createDevice(
  name: string,
  onMessage: MESSAGE_FUNC,
  sendToParent: MESSAGE_FUNC,
  ...tags: string[]
) {
  const id = createGuid()
  const children: DEVICE[] = []

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
    match(target) {
      const itarget = target.toLowerCase()
      return (
        id === target ||
        name.toLowerCase() === itarget ||
        tags.findIndex((tag) => tag.toLowerCase() === itarget) !== -1
      )
    },
    send(message, data) {
      const { target, path } = parseMessage(message)

      // we match target
      if (device.match(target)) {
        onMessage(path, data)
        return
      }

      // send to matched child
      const route = children.find((child) => child.match(target))
      if (route) {
        route.send(path, data)
        return
      }

      // send to parent device
      sendToParent(message, data)
    },
  }

  return device
}

/*

what is a network device ??

a name
a list of tags
a list refs to children network devices
a function to send a message to parent

will need to figure out how to bridge parent network devices ?

*/
