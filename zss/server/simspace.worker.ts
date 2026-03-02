/**
 * Simspace worker for Node.js server mode.
 * Uses worker_threads.parentPort instead of Web Worker postMessage/onmessage.
 */
import { parentPort } from 'worker_threads'

import { createforward, shouldforwardservertoclient } from '../device/forward'
import '../device/clock'
import '../device/gadgetserver'
import '../device/modem'
import { started } from '../device/vm'

const { forward } = createforward((message) => {
  if (shouldforwardservertoclient(message) && parentPort) {
    parentPort.postMessage(message)
  }
})

parentPort?.on('message', (data) => {
  forward(data)
})

// begin simspace
setTimeout(started, 100)
