import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import './device/boardrunner'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
