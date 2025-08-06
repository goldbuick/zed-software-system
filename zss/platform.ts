import { session_reset } from './device/api'
import { createforward, shouldforwardclienttoserver } from './device/forward'
import { SOFTWARE } from './device/session'
import { MAYBE, ispresent } from './mapping/types'
import simspace from './simspace??worker'
import stubspace from './stubspace??worker'

let platform: MAYBE<Worker>
let platformhalt: MAYBE<() => void>

// disconnect

export function createplatform(isstub = false) {
  if (ispresent(platform)) {
    return
  }
  // reset session
  session_reset(SOFTWARE)

  // create backend
  platform = isstub ? new stubspace() : new simspace()

  // create bridge
  const { forward, disconnect } = createforward((message) => {
    if (ispresent(platform) && shouldforwardclienttoserver(message)) {
      platform.postMessage(message)
    }
  })

  // handle message
  function platformmessages(event: MessageEvent<any>) {
    return forward(event.data)
  }

  platform.addEventListener('message', platformmessages)

  platformhalt = () => {
    disconnect()
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
