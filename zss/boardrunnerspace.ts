import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import { setassignedplayerid } from './device/boardrunner'
import './device/boardrunneruser'
import './device/rxreplclient'
import { isstring } from './mapping/types'

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
    setassignedplayerid(isstring(msg?.data) ? msg?.data : '')
    return
  }
  forward(msg)
}
