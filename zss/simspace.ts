import { createforward } from './device/forward'
// these are all back-end devices that operate within the web worker
import { started } from './device/vm'
import './device/gadgetserver'
import './device/modem'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin simspace
setTimeout(started, 100)
