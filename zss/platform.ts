import { MESSAGE, sessionreset } from './device/api'
import {
  createforward,
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
let platformhalt: MAYBE<() => void>

export function createplatform(isstub = false) {
  if (ispresent(platform)) {
    return
  }
  // reset session
  sessionreset(SOFTWARE)

  // create heavy worker
  heavy = new heavyspace()

  // create backend
  platform = isstub ? new stubspace() : new simspace()

  // create bridge
  const { forward, disconnect } = createforward((message) => {
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
  })

  // handle messages from heavy
  function heavymessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    // handles messages from heavy -> server
    if (shouldforwardclienttoserver(message) && ispresent(platform)) {
      platform.postMessage(message)
    }
    return forward(message)
  }
  heavy.addEventListener('message', heavymessages)

  // handle messages from  platform
  function platformmessages(event: MessageEvent<any>) {
    const message = event.data as MESSAGE
    // handles routing messages from server -> heavy
    if (shouldforwardclienttoheavy(message) && ispresent(heavy)) {
      heavy.postMessage(message)
    }
    return forward(message)
  }
  platform.addEventListener('message', platformmessages)

  platformhalt = () => {
    disconnect()
    if (ispresent(heavy)) {
      heavy.removeEventListener('message', heavymessages)
      heavy.terminate()
    }
    heavy = undefined
    if (ispresent(platform)) {
      platform.removeEventListener('message', platformmessages)
      platform.terminate()
    }
    platform = undefined
  }
}

export function haltplatform() {
  platformhalt?.()
  platformhalt = undefined
}
