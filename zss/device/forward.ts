import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { ismessage, MESSAGE } from './api'

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = new Set<string>()

  function forward(message: any) {
    if (
      ismessage(message) &&
      message.target !== 'tick' &&
      message.target !== 'tock' &&
      syncids.has(message.id) === false
    ) {
      syncids.add(message.id)
      hub.invoke(message)
    }
  }

  const device = createdevice('forward', ['all'], (message) => {
    if (!syncids.has(message.id)) {
      syncids.add(message.id)
      handler(message)
    }
  })

  function disconnect() {
    hub.disconnect(device)
  }

  return { forward, disconnect }
}

// create server -> client forward
export function shouldforwardservertoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'info':
    case 'debug':
    case 'error':
    case 'tick':
    case 'tock':
    case 'ready':
    case 'second':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'vm':
        case 'synth':
        case 'modem':
        case 'bridge':
        case 'register':
        case 'gadgetclient':
          return true
      }
      switch (route.path) {
        case 'sync':
        case 'joinack':
        case 'ackoperator':
        case 'gadgetclient':
          return true
      }
      break
    }
  }
  // console.info('serv', message.target)
  return false
}

// create server -> client forward
export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  switch (message.target) {
    case 'info':
    case 'debug':
    case 'error':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'vm':
        case 'modem':
        case 'gadgetserver':
          return true
      }
      switch (route.path) {
        case 'sync':
        case 'joinack':
          return true
      }
      break
    }
  }
  // console.info('client', message.target)
  return false
}
