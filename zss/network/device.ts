import { createGuid } from '../mapping/guid'

export type MESSAGE_FUNC = (message: string, data: any) => void

export type DEVICE = {
  id: () => string
  name: () => string
  tags: () => string[]
  match: (target: string) => boolean
  handle: (message: string, data: any) => void
  send: MESSAGE_FUNC
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
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

  let branches: DEVICE[] = []

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
    handle(message, data) {
      const { target, path } = parseMessage(message)

      // does target match branches ?
      const matched = branches.filter((branch) => {
        if (branch.match(target)) {
          branch.handle(path, data)
        }
      })

      // otherwise US
      if (matched.length === 0) {
        onMessage(message, data)
      }
    },
    send(message, data) {
      const { target, path } = parseMessage(message)

      if (device.match(target)) {
        // we match target
        device.handle(path, data)
      } else {
        // send to parent device
        onParent(message, data)
      }
    },
    connect(device) {
      // TODO, this should set onParent for this device
      branches.push(device)
    },
    disconnect(device) {
      branches = branches.filter((item) => item !== device)
    },
  }

  return device
}
