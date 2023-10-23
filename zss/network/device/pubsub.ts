import { MESSAGE_FUNC, createDevice, createMessage } from 'zss/network/device'

export type PUBLISHER = {
  send: MESSAGE_FUNC
  fromParent: MESSAGE_FUNC
  linkParent: (handler: MESSAGE_FUNC) => void
  publish: (target: string, data: any) => void
}

export function createPublisher(name: string, handler: MESSAGE_FUNC) {
  const subscribers: Record<string, number> = {}

  const device = createDevice(name, [], (message) => {
    switch (message.target.toLowerCase()) {
      case 'sub':
        subscribers[message.origin] = Date.now()
        break
      default:
        handler(message)
        break
    }
  })

  const publisher: PUBLISHER = {
    send(message) {
      device.send(message)
    },
    fromParent(message) {
      device.fromParent(message)
    },
    linkParent(handler) {
      device.linkParent(handler)
    },
    publish(target, data) {
      const now = Date.now()
      const origins = Object.keys(subscribers)

      origins.forEach((origin) => {
        const seconds = Math.floor((now - subscribers[origin]) / 1000)
        if (seconds < 16) {
          device.send(createMessage(`${origin}:${target}`, data))
        } else {
          // dead sub
          delete subscribers[origin]
        }
      })
    },
  }

  return publisher
}

export type SUBSCRIBE = {
  send: MESSAGE_FUNC
  fromParent: MESSAGE_FUNC
  linkParent: (handler: MESSAGE_FUNC) => void
  subscribe: (target: string) => void
  unsubscribe: () => void
}

export function createSubscribe(name: string, handler: MESSAGE_FUNC) {
  let publisher = ''

  const device = createDevice(name, [], handler)

  function sendSubscribe() {
    if (publisher) {
      device.send(createMessage(`${publisher}:sub`))
    }
  }

  let timer = 0

  const subscribe: SUBSCRIBE = {
    send(message) {
      device.send(message)
    },
    fromParent(message) {
      device.fromParent(message)
    },
    linkParent(handler) {
      device.linkParent(handler)
    },
    subscribe(target) {
      publisher = target
      sendSubscribe()
      clearInterval(timer)
      timer = window.setInterval(sendSubscribe, 8000)
    },
    unsubscribe() {
      publisher = ''
      clearInterval(timer)
    },
  }

  return subscribe
}
