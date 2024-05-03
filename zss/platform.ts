import { createforward } from './device/forward'
import ZSSWorker from './instance??worker'

// devices that operate within web main
import './device/gadgetclient'
import './device/pcspeaker'
import './device/shared'
import './device/urlstate'

export function createplatform() {
  const instance = new ZSSWorker()

  const forward = createforward((message) => instance.postMessage(message))

  instance.addEventListener('message', (event) => {
    // console.info(event.data)
    forward(event.data)
  })
}
