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
  tags: string[],
  onParent: MESSAGE_FUNC,
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
    match(target) {
      const itarget = target.toLowerCase()
      return (
        id === target ||
        iname === itarget ||
        itags.findIndex((tag) => tag === itarget) !== -1
      )
    },
    send(message, data) {
      const { target, path } = parseMessage(message)

      // we match target
      if (device.match(target)) {
        onMessage(path, data)
        return
      }

      // send to parent device
      onParent(message, data)
    },
  }

  return device
}

/*

what is a network device ??

a name
a list of tags
a function to handle a message for device
a function to send a message to parent

will need to figure out how to bridge parent network devices ?

*/
