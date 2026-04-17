import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import './device/boardrunner'
import './device/boardrunneruser'
import './device/jsonsyncclient'

const { forward } = createforward(
  (message) => {
    if (shouldforwardboardrunnertoclient(message)) {
      postMessage(message)
    }
  },
  // boardrunner worker is authoritative for its elected boards (Phase 2 of
  // the boardrunner authoritative-tick plan), so it needs the server clock
  // pulse. Allow ticktock through this bridge.
  { allowticktock: true },
)

onmessage = function handleMessage(event) {
  forward(event.data)
}
