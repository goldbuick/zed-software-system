import { createforward } from './device/forward'
import { ready } from './device/vm'

// these are all back-end devices
// devices that operate within the web worker
//     './device/vm'
import './device/gadgetserver'
import './device/modem'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin process
setTimeout(ready)
