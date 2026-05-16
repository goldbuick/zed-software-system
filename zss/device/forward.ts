import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { MESSAGE, ismessage } from './api'

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = new Set<string>()

  function forward(message: any) {
    if (
      ismessage(message) &&
      message.target !== 'ticktock' &&
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
    device.disconnect()
  }

  return { forward, disconnect }
}

// outbound message server -> client
export function shouldforwardonpeerserver(message: MESSAGE): boolean {
  // direct-tagged messages travelled on a direct peer channel and must
  // never leak onto the host hub-and-spoke bridge in either direction
  if (message.direct === true) {
    return false
  }
  switch (message.target) {
    case 'ready':
    case 'ticktock':
      // console.info('server blocked', message.target)
      return false
  }
  // todo, don't forward player scoped messages to peers that will block them
  return true
}

// outbound message client -> server
export function shouldforwardonpeerclient(message: MESSAGE): boolean {
  if (message.direct === true) {
    return false
  }
  switch (message.target) {
    case 'ready':
    case 'second':
    case 'ticktock':
      // console.info('client blocked', message.target)
      return false
  }
  return true
}

// create server -> client forward
export function shouldforwardservertoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'log':
    case 'chat':
    case 'ready':
    case 'toast':
    case 'second':
    case 'ticktock':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'heavy':
        case 'synth':
        case 'modem':
        case 'bridge':
        case 'register':
        case 'boardrunner':
        case 'gadgetclient':
        case 'perfreport':
          return true
      }
      switch (route.path) {
        case 'sync':
        case 'heavy':
        case 'joinack':
        case 'acklook':
        case 'acklogin':
        case 'ackoperator':
        case 'ackzsswords':
        case 'boardrunner':
        case 'gadgetclient':
          return true
      }
      break
    }
  }
  return false
}

// create client -> server forward
export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  const route = parsetarget(message.target)
  switch (route.target) {
    case 'vm':
    case 'chip':
    case 'modem':
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

// heavy worker messages

// create client -> heavy forward
export function shouldforwardclienttoheavy(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'heavy':
          return true
      }
      switch (route.path) {
        case 'acklook':
          return true
      }
      return false
    }
  }
}

// create heavy -> client forward
export function shouldforwardheavytoclient(): boolean {
  return true
}

// boardrunner worker messages

// create client -> boardrunner forward
export function shouldforwardclienttoboardrunner(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'chip':
        case 'boardrunner':
          return true
      }
      break
    }
  }
  return false
}

// create boardrunner -> client forward
export function shouldforwardboardrunnertoclient(): boolean {
  return true
}

// direct join -> runner peer messages (subset of shouldforwardclienttoboardrunner).
// only this narrow set is eligible to bypass the host hop on the direct channel.
// v1 routes only boardrunner:input through this; chip:* will follow in phase 2.
export function shouldforwardclienttodirectrunner(message: MESSAGE): boolean {
  switch (message.target) {
    case 'second':
    case 'ready':
      return true
  }
  const route = parsetarget(message.target)
  if (route.target === 'boardrunner' && route.path === 'input') {
    return true
  }
  return false
}

// inbound direct-peer message (we are the runner) -> boardrunner worker
export function shouldforwardincomingdirecttoboardrunner(
  message: MESSAGE,
): boolean {
  return shouldforwardclienttodirectrunner(message)
}
