import { createforward } from './device/forward'
import ZSSWorker from './instance??worker'
import './device/bip'
import './device/gadgetclient'
import './device/pcspeaker'
import './device/modem'
import './device/register'
import './device/tape'
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
