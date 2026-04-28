import boardrunnerspace from './boardrunnerspace??worker'
import { MESSAGE, boardrunnerboot, sessionreset } from './device/api'
import {
  createforward,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoheavy,
  shouldforwardclienttoserver,
} from './device/forward'
import { SOFTWARE } from './device/session'
import heavyspace from './heavyspace??worker'
import { MAYBE, ispresent } from './mapping/types'
import simspace from './simspace??worker'
import stubspace from './stubspace??worker'

let heavy: MAYBE<Worker>
let platform: MAYBE<Worker>
let boardrunner: MAYBE<Worker>
let platformhalt: MAYBE<() => void>

export function createplatform(isstub = false, climode = false) {
  if (ispresent(platform)) {
    return
  }
  // reset session
  sessionreset(SOFTWARE)

  // create heavy worker
  heavy = new heavyspace()

  // create boardrunner worker
  boardrunner = new boardrunnerspace()

  // create backend
  platform = isstub ? new stubspace() : new simspace()
  platform.postMessage({ target: 'config', data: climode })

  // create bridge
  const { forward, disconnect } = createforward((message) => {
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
  })

  // handle messages from heavy
  function handleheavymessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    return forward(message)
  }
  heavy.addEventListener('message', handleheavymessages)

  // handle messages from boardrunner
  function handleboardrunnermessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    return forward(message)
  }
  boardrunner.addEventListener('message', handleboardrunnermessages)

  // handle messages from platform
  function handleplatformmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
    return forward(message)
  }
  platform.addEventListener('message', handleplatformmessages)

  // define platform halt function
  platformhalt = () => {
    disconnect()
    if (ispresent(heavy)) {
      heavy.removeEventListener('message', handleheavymessages)
      heavy.terminate()
    }
    heavy = undefined
    if (ispresent(boardrunner)) {
      boardrunner.removeEventListener('message', handleboardrunnermessages)
      boardrunner.terminate()
    }
    boardrunner = undefined
    if (ispresent(platform)) {
      platform.removeEventListener('message', handleplatformmessages)
      platform.terminate()
    }
    platform = undefined
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}
