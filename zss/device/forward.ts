import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { MESSAGE, ismessage } from './api'

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = new Set<string>()

  function forward(message: any) {
    if (
      ismessage(message) &&
      message.target !== 'tock' &&
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

// outbound message
export function shouldnotforwardonpeerserver(message: MESSAGE): boolean {
  switch (message.target) {
    case 'tock':
    case 'ticktock':
    case 'ready':
      return true
  }
  return false
}

// create server -> client forward
export function shouldforwardservertoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'log':
    case 'chat':
    case 'tock':
    case 'ticktock':
    case 'ready':
    case 'toast':
    case 'second':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'vm':
        case 'heavy':
        case 'synth':
        case 'modem':
        case 'bridge':
        case 'register':
        case 'gadgetclient':
        case 'jsonsyncclient':
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
    case 'tock':
    case 'ticktock':
    case 'second':
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
    case 'jsonsyncserver':
      return true
  }
  switch (route.path) {
    case 'sync':
    case 'desync':
    case 'joinack':
    case 'needsnapshot':
    case 'ackboardrunner':
      return true
  }
  return false
}

// heavy worker messages

// create client -> heavy forward
export function shouldforwardclienttoheavy(message: MESSAGE): boolean {
  switch (message.target) {
    case 'tock':
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'heavy':
        case 'jsonsyncclient':
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
export function shouldforwardheavytoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'tock':
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'heavy':
        case 'jsonsyncserver':
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

// boardrunner worker messages

// create client -> boardrunner forward
export function shouldforwardclienttoboardrunner(message: MESSAGE): boolean {
  switch (message.target) {
    case 'tock':
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'jsonsyncclient':
          return true
      }
      return false
    }
  }
}

// create boardrunner -> server forward
export function shouldforwardboardrunnertoserver(message: MESSAGE): boolean {
  return shouldforwardclienttoserver(message)
}

// create boardrunner -> client forward
export function shouldforwardboardrunnertoclient(message: MESSAGE): boolean {
  // jsonsync:changed is a local broadcast used by in-process observers; do not
  // leak it across the process boundary.
  if (message.target === 'jsonsync:changed') {
    return false
  }
  return true
}
