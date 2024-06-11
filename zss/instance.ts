import { createforward } from './device/forward'
import { ready } from './device/vm'

// devices that operate within the web worker
import './device/clock'
import './device/gadgetserver'
import './device/modem'
import './device/shared'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin process
queueMicrotask(ready)
