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

export function shouldforwardonpeerserver(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ready':
    case 'ticktock':
      return false
  }
  return true
}

export function shouldforwardonpeerclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ready':
    case 'second':
    case 'ticktock':
      return false
  }
  return true
}

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
        case 'register':
        case 'gadgetclient':
        case 'perfreport':
        case 'netterminal':
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
  return false
}

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
