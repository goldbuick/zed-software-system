/**
 * Simspace for Node.js server mode - fork-compatible (uses process.send/on).
 * Fork spawns a new process; worker_threads would use parentPort.
 */
import { createforward, shouldforwardservertoclient } from '../device/forward'
import '../device/clock'
import '../device/gadgetserver'
import '../device/modem'
import { started } from '../device/vm'

const { forward } = createforward((message) => {
  if (shouldforwardservertoclient(message) && process.send) {
    process.send(message)
  }
})

process.on('message', (data: any) => {
  forward(data)
})

setTimeout(started, 100)
