import boardrunnerspace from './boardrunnerspace??worker'
import { MESSAGE, sessionreset } from './device/api'
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
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    if (shouldforwardclienttoboardrunner(message) && ispresent(boardrunner)) {
      boardrunner.postMessage(message)
    }
  })

  // handle messages from all workers
  function handlemessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    return forward(message)
  }

  // handle messages from heavy
  heavy.addEventListener('message', handlemessages)

  // handle messages from boardrunner
  boardrunner.addEventListener('message', handlemessages)

  // handle messages from platform
  platform.addEventListener('message', handlemessages)

  // define platform halt function
  platformhalt = () => {
    disconnect()
    if (ispresent(heavy)) {
      heavy.removeEventListener('message', handlemessages)
      heavy.terminate()
    }
    heavy = undefined
    if (ispresent(boardrunner)) {
      boardrunner.removeEventListener('message', handlemessages)
      boardrunner.terminate()
    }
    boardrunner = undefined
    if (ispresent(platform)) {
      platform.removeEventListener('message', handlemessages)
      platform.terminate()
    }
    platform = undefined
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}
