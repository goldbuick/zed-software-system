import { createforward } from './device/forward'
import ZSSWorker from './instance??worker'

// devices that operate within web main
import './device/bip'
import './device/gadgetclient'
import './device/pcspeaker'
import './device/register'
import './device/shared'
import './device/tape'

export function createplatform() {
  const instance = new ZSSWorker()

  const forward = createforward((message) => instance.postMessage(message))

  instance.addEventListener('message', (event) => {
    // console.info(event.data)
    forward(event.data)
  })
}
