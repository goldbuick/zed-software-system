import { createforward, shouldforwardheavytoclient } from 'zss/device/forward'

import './device/heavy'

const { forward } = createforward((message) => {
  if (shouldforwardheavytoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
