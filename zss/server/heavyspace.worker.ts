/**
 * Heavyspace worker for Node.js server mode.
 * Uses worker_threads.parentPort instead of Web Worker postMessage/onmessage.
 */
import { parentPort } from 'worker_threads'

import { createforward, shouldforwardheavytoclient } from '../device/forward'
import '../device/heavy'

const { forward } = createforward((message) => {
  if (shouldforwardheavytoclient() && parentPort) {
    parentPort.postMessage(message)
  }
})

parentPort?.on('message', (data) => {
  forward(data)
})
