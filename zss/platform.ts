import { createforward } from './device/forward'
import ZSSWorker from './instance??worker'

// devices that operate within web main
import './device/gadgetclient'
import './device/shared'

const instance = new ZSSWorker()

const forward = createforward((message) => instance.postMessage(message))

instance.addEventListener('message', (event) => {
  forward(event.data)
})
