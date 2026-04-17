import { createforward, shouldforwardheavytoclient } from 'zss/device/forward'

import './device/heavy'
import './device/jsonsyncclient'

const { forward } = createforward((message) => {
  if (shouldforwardheavytoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
