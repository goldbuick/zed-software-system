import { createforward, shouldforwardheavytoclient } from './device/forward'
import './device/heavy'

const { forward } = createforward((message) => {
  if (shouldforwardheavytoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
