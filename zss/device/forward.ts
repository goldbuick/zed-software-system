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

// outbound message
export function shouldforwardonpeerserver(message: MESSAGE): boolean {
  switch (message.target) {
    case 'log':
    case 'chat':
    case 'toast':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'synth':
        case 'modem':
        case 'register':
        case 'boardrunner':
        case 'gadgetclient':
          return true
      }
      switch (route.path) {
        case 'sync':
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
  // const route = parsetarget(message.target)
  console.info('server blocked', message.target)
  return false
}

// outbound message
export function shouldforwardonpeerclient(message: MESSAGE): boolean {
  switch (message.target) {
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
        case 'gadgetclient':
        case 'boardrunner':
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

// create client -> server forward
export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  const route = parsetarget(message.target)
  switch (route.target) {
    case 'vm':
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
        case 'boardrunner':
          return true
        // case 'vm':
        //   // chip / scroll / sidebar messages also need to reach the
        //   // boardrunner so the chip OS running there can deliver them
        //   return true
      }
      return false
    }
  }
}

// create boardrunner -> client forward
export function shouldforwardboardrunnertoclient(): boolean {
  return true
}
