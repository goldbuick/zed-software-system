import { createforward } from './device/forward'
// these are all back-end devices that operate within the web worker
import { started } from './device/peer'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin stubspace
setTimeout(started, 100)
