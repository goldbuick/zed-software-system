import { createforward } from 'zss/device/forward'

// devices that operate within the web worker
import 'zss/device/clock'
import 'zss/device/gadgetserver'
import 'zss/device/shared'
import 'zss/device/vm'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}
