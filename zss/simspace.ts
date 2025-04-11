import { createforward, shouldforwardservertoclient } from './device/forward'
// these are all back-end devices that operate within the web worker
import './device/clock'
import './device/gadgetserver'
import './device/modem'
import { started } from './device/vm'

const { forward } = createforward((message) => {
  if (shouldforwardservertoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin simspace
setTimeout(started, 100)
