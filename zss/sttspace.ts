import { createforward, shouldforwardstttoclient } from 'zss/device/forward'

import './device/sttworker'

const { forward } = createforward((message) => {
  if (shouldforwardstttoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
