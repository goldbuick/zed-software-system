import { ismessage } from 'zss/device/api'
import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import './device/gadgetmemoryprovider'
import { setassignedplayerid } from './device/boardrunner'
import './device/boardrunneruser'
import './device/jsonsyncclient'
import './device/rxreplclient'
import { isstring } from './mapping/types'

function boardrunnershouldforwardinbound(raw: unknown): boolean {
  if (!ismessage(raw)) {
    return false
  }
  // if (import.meta.env.DEV && raw.target.startsWith('jsonsync')) {
  //   console.info('jsonsync message', raw)
  // }
  return true
}

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
  if (!boardrunnershouldforwardinbound(msg)) {
    return
  }
  forward(msg)
}
