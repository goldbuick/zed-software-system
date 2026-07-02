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
  switch (message.target) {
    case 'ready':
    case 'ticktock':
      return false
  }
  // todo, don't forward player scoped messages to peers that will block them
  return true
}

// outbound message client -> server
export function shouldforwardonpeerclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ready':
    case 'second':
    case 'ticktock':
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
        case 'tts':
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

// stt worker messages

// create client -> stt forward
export function shouldforwardclienttostt(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      return route.target === 'stt'
    }
  }
}

// create stt -> client forward
export function shouldforwardstttoclient(): boolean {
  return true
}

// tts worker messages

// create client -> tts forward
export function shouldforwardclienttotts(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      return route.target === 'tts'
    }
  }
}

// create tts -> client forward
export function shouldforwardttstoclient(): boolean {
  return true
}
