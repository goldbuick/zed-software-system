import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { MESSAGE, ismessage } from './api'

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

// outbound message
export function shouldnotforwardonpeerserver(message: MESSAGE): boolean {
  switch (message.target) {
    case 'tick':
    case 'tock':
    case 'ready':
      // console.info('shouldnotforwardonpeerserver', message.target)
      return true
  }
  return false
}

// create server -> client forward
export function shouldforwardservertoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'log':
    case 'info':
    case 'error':
    case 'tick':
    case 'tock':
    case 'ready':
    case 'toast':
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
        case 'acklogin':
        case 'ackoperator':
        case 'ackzsswords':
        case 'gadgetclient':
          return true
      }
      break
    }
  }
  return false
}

// outbound message
export function shouldnotforwardonpeerclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'tick':
    case 'tock':
    case 'second':
      // console.info('shouldnotforwardonpeerclient', message.target)
      return true
  }
  return false
}

// create client -> server forward
export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  const route = parsetarget(message.target)
  switch (route.target) {
    case 'vm':
    case 'modem':
    case 'gadgetserver':
      return true
  }
  switch (route.path) {
    case 'sync':
    case 'desync':
    case 'joinack':
      return true
  }
  return false
}
