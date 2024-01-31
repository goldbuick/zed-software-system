import { createforward } from 'zss/device/forward'
import { ready } from 'zss/device/vm'

// devices that operate within the web worker
import 'zss/device/clock'
import 'zss/device/gadgetserver'
import 'zss/device/shared'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin process
queueMicrotask(ready)
