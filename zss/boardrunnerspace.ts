import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import './device/boardrunner'
import './device/jsonsyncclient'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
