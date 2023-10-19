import { createGuid } from '../mapping/guid'

export type MESSAGE = {
  origin: string
  target: string
  data?: any
}

export function createMessage(target: string, data?: any): MESSAGE {
  if (data !== undefined) {
    return { origin: '', target, data }
  }
  return { origin: '', target }
}

export type MESSAGE_FUNC = (message: MESSAGE) => void

export type DEVICE = {
  id: () => string
  name: () => string
  tags: () => string[]
  match: (target: string) => boolean
  send: MESSAGE_FUNC
  handle: MESSAGE_FUNC
  fromParent: MESSAGE_FUNC
  linkParent: (handler: MESSAGE_FUNC) => void
  connect: (device: DEVICE) => void
  disconnect: (device: DEVICE) => void
}

export function parseTarget(targetString: string) {
  const [target, ...path] = targetString.split(':')
  return { target, path: path.join(':') }
}

function updateOrigin(origin: string, name: string) {
  if (!origin) {
    return name
  }
  return `${name}:${origin}`
}

export function createDevice(
  name: string,
  tags: string[],
  onMessage: MESSAGE_FUNC,
) {
  const id = createGuid()
  const iname = name.toLowerCase()
  const itags = tags.map((tag) => tag.toLowerCase())

  let branches: DEVICE[] = []
  let onParent: MESSAGE_FUNC | undefined

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
        'all' === itarget ||
        iname === itarget ||
        itags.findIndex((tag) => tag === itarget) !== -1
      )
    },
    send(message) {
      const { target, path } = parseTarget(message.target)
      const matched = device.match(target)

      // we match target
      if (matched) {
        device.handle({ ...message, target: path })
        return
      }

      // send to parent device
      onParent?.({
        ...message,
        origin: updateOrigin(message.origin, name),
      })
    },
    handle(message) {
      const { target, path } = parseTarget(message.target)

      // does target match branches ?
      const matched = branches.filter((branch) => {
        if (branch.match(target)) {
          branch.handle({ ...message, target: path })
          return true
        }
        return false
      })

      // otherwise US
      if (matched.length === 0) {
        onMessage(message)
      }
    },
    fromParent(message) {
      const { target, path } = parseTarget(message.target)
      const matched = device.match(target)

      // we match target
      if (matched) {
        device.handle({ ...message, target: path })
      }
    },
    linkParent(handler) {
      onParent = handler
    },
    connect(device) {
      device.linkParent(device.send)
      branches.push(device)
    },
    disconnect(device) {
      branches = branches.filter((item) => item !== device)
    },
  }

  return device
}
