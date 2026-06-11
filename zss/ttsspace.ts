import { createforward, shouldforwardttstoclient } from 'zss/device/forward'

import './device/ttsworker'

const { forward } = createforward((message) => {
  if (shouldforwardttstoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
