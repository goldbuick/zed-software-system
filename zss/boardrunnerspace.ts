import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import { setassignedplayer } from './device/boardrunner'
import { isstring } from './mapping/types'
import './device/rxreplclient'
import './device/gadgetmemoryprovider'

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
  const msg = event.data
  if (msg?.target === 'registerplayer') {
    setassignedplayer(isstring(msg?.data) ? msg?.data : '')
    return
  }
  forward(msg)
}
