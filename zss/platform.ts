import { createforward } from './device/forward'
import ZSSWorker from './instance??worker'
// these are all front-end devices
import './device/gadgetclient'
import './device/pcspeaker'
import './device/modem'
import './device/register'
import './device/tape'
import './device/clock'
import { ispresent } from './mapping/types'

let instance: Worker

export function createplatform() {
  if (ispresent(instance)) {
    return
  }

  instance = new ZSSWorker()
  const forward = createforward((message) => instance.postMessage(message))
  instance.addEventListener('message', (event) => forward(event.data))
}
