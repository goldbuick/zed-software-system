/**
 * Heavyspace for Node.js server mode - fork-compatible.
 */
import { createforward, shouldforwardheavytoclient } from '../device/forward'
import '../device/heavy'

const { forward } = createforward((message) => {
  if (shouldforwardheavytoclient(message) && process.send) {
    process.send(message)
  }
})

process.on('message', (data: any) => {
  forward(data)
})
