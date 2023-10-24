import {
  DEVICE,
  MESSAGE_FUNC,
  createDevice,
  createMessage,
} from 'zss/network/device'

export type PUBLISHER = {
  device: DEVICE
  publish: (target: string, data: any) => void
}

export type PUBLISHER_NEW_SUB_FUNC = (origin: string) => void

export function createPublisher(
  name: string,
  onSub: PUBLISHER_NEW_SUB_FUNC,
  onMessage: MESSAGE_FUNC,
) {
  const subscribers: Record<string, number> = {}

  function trimOrigins() {
    const now = Date.now()
    const origins = Object.keys(subscribers)

    origins.forEach((origin) => {
      const seconds = Math.floor((now - subscribers[origin]) / 1000)
      // dead sub
      if (seconds > 16) {
        delete subscribers[origin]
      }
    })
  }

  const device = createDevice(name, [], (message) => {
    switch (message.target.toLowerCase()) {
      case 'sub': {
        trimOrigins()

        // detect new sub
        if (subscribers[message.origin] === undefined) {
          onSub(message.origin)
        }

        // update timestamp
        subscribers[message.origin] = Date.now()
        break
      }
      default:
        onMessage(message)
        break
    }
  })

  const publisher: PUBLISHER = {
    device,
    publish(target, data) {
      trimOrigins()

      const origins = Object.keys(subscribers)
      origins.forEach((origin) => {
        device.send(createMessage(`${origin}:${target}`, data))
      })
    },
  }

  return publisher
}

export type SUBSCRIBE = {
  device: DEVICE
  subscribe: (target: string) => void
  unsubscribe: () => void
}

export function createSubscribe(name: string, handler: MESSAGE_FUNC) {
  let publisher = ''

  const device = createDevice(name, [], handler)

  function sendSubscribe() {
    if (publisher) {
      device.send(createMessage(`${publisher}:sub`))
      setTimeout(sendSubscribe, 8000)
    }
  }

  const subscribe: SUBSCRIBE = {
    device,
    subscribe(target) {
      publisher = target
      sendSubscribe()
    },
    unsubscribe() {
      publisher = ''
    },
  }

  return subscribe
}
