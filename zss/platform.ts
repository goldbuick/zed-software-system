import { createforward } from './device/forward'
import { ispresent } from './mapping/types'
import simspace from './simspace??worker'
import stubspace from './stubspace??worker'

let platform: Worker

export function createplatform(isstub = false) {
  if (ispresent(platform)) {
    return
  }
  // create backend
  platform = isstub ? new stubspace() : new simspace()
  // create bridge
  const forward = createforward((message) => platform.postMessage(message))
  platform.addEventListener('message', (event) => forward(event.data))
}
