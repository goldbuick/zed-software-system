import { createforward, shouldforwardservertoclient } from './device/forward'
// these are all back-end devices that operate within the web worker
import { started } from './device/stub'
import './device/clock'

const { forward } = createforward((message) => {
  if (shouldforwardservertoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin stubspace
setTimeout(started, 100)
