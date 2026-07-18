import { createdevice, parsetarget } from 'zss/device'
import { createrecentmessageids } from 'zss/device/recentmessageids'
import type { MESSAGE } from 'zss/device/types'
import { hub } from 'zss/hub'

import { ismessage } from './types'

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = createrecentmessageids()

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

// outbound message server -> client (peer host)
export function shouldforwardonpeerserver(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ready':
    case 'ticktock':
      return false
  }
  // todo, don't forward player scoped messages to peers that will block them
  return true
}

// outbound message client -> server (peer join)
export function shouldforwardonpeerclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ready':
    case 'second':
    case 'ticktock':
      return false
  }
  return true
}

// create server -> client forward (peer host wire)
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
        case 'stt':
        case 'synth':
        case 'modem':
        case 'bridge':
        case 'wanixserver':
        case 'wanixclient':
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

// create client -> server forward (peer join wire)
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

// create client -> boardrunner forward (peer join wire)
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
