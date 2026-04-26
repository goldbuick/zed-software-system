/**
 * Message routing at worker and peer boundaries.
 *
 */

import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { MESSAGE, ismessage } from './api'

/** Cap dedupe set so long sessions do not grow `syncids` without bound. */
const FORWARD_SYNCIDS_CAP = 4096

export function createforward(handler: (message: MESSAGE) => void) {
  const syncids = new Set<string>()
  const syncidorder: string[] = []

  function syncidsrecord(id: string): void {
    syncids.add(id)
    syncidorder.push(id)
    while (syncidorder.length > FORWARD_SYNCIDS_CAP) {
      const old = syncidorder.shift()
      if (old !== undefined) {
        syncids.delete(old)
      }
    }
  }

  function forward(message: any) {
    if (
      !ismessage(message) ||
      syncids.has(message.id) ||
      message.target === 'ticktock'
    ) {
      return
    }
    syncidsrecord(message.id)
    hub.invoke(message)
  }

  const device = createdevice('forward', ['all'], (message) => {
    if (!syncids.has(message.id)) {
      syncidsrecord(message.id)
      handler(message)
    }
  })

  function disconnect() {
    device.disconnect()
  }

  return { forward, disconnect }
}

// peerjs message gates

export function shouldforwardonpeer(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
    case 'second':
    case 'ready':
      return false
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        // list of devices that should not be forwarded on peerjs
        case 'heavy':
          return false
        default:
          break
      }
      switch (route.path) {
        case 'acklook':
          return false
        default:
          break
      }
      break
    }
  }
  return true
}

// sim space message gates

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldforwardservertoclient(_message: MESSAGE): boolean {
  // send all for now, until we run into a problem
  return true
}

// client message gates

export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  const route = parsetarget(message.target)
  switch (route.target) {
    case 'vm':
    case 'modem':
    case 'rxreplserver':
      return true
  }
  switch (route.path) {
    case 'sync':
    case 'desync':
    case 'joinack':
    case 'acktick':
      return true
  }
  // console.info('blocked shouldforwardclienttoserver', route.target, route.path)
  return false
}

// heavy worker message gates

export function shouldforwardclienttoheavy(message: MESSAGE): boolean {
  switch (message.target) {
    // clock messages
    case 'second':
    case 'ready':
      return true
    case 'ticktock':
      return false
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        // list of devices that should forwarded to heavy space
        case 'heavy':
          return true
        default:
          break
      }
      switch (route.path) {
        // list of paths that should be forwarded to heavy space
        case 'acklook':
          return true
        default:
          break
      }
      // console.info(
      //   'blocked shouldforwardclienttoheavy',
      //   route.target,
      //   route.path,
      // )
      break
    }
  }
  return false
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldforwardheavytoclient(_message: MESSAGE): boolean {
  return true
}

// boardrunner worker message gates

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
        // list of devices that should forwarded to boardrunner space
        case 'user':
        case 'boardrunner':
        case 'rxreplclient':
          return true
        default:
          // console.info('blocked clienttoboardrunner', message.target)
          break
      }
      break
    }
  }
  return false
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldforwardboardrunnertoclient(_message: MESSAGE): boolean {
  // send all for now, until we run into a problem
  return true
}
