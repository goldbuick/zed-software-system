import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import './device/boardrunner-gadget'
import 'zss/feature/gunsync/roommirror'
import './device/boardrunner'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
