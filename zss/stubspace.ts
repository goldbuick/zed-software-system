// these are all back-end devices that operate within the web worker

import { createforward } from './device/forward'
import './device/peer'

const forward = createforward((message) => postMessage(message))

onmessage = function handleMessage(event) {
  forward(event.data)
}

// begin process
