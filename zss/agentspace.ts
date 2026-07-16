import { createforward, shouldforwardagenttoclient } from 'zss/device/forward'

import './device/agentworker'

const { forward } = createforward((message) => {
  if (shouldforwardagenttoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
