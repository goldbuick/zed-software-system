import { parsetarget } from 'zss/device'
import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'
import type { MESSAGE } from 'zss/device/api'
import { ismessage } from 'zss/device/api'
import { isstring } from 'zss/mapping/types'

import './device/gadgetmemoryprovider'
import './device/boardrunner'
import './device/boardrunneruser'
import './device/jsonsyncclient'

const BOARDRUNNER_WORKER_SET_LOCAL_PLAYER = 'boardrunnerworker:setlocalplayer'

/** Tab-local player id; set from main via `BOARDRUNNER_WORKER_SET_LOCAL_PLAYER`. */
let boardrunnerlocalplayerid = ''

function boardrunnerinboundallowsanyplayer(message: MESSAGE): boolean {
  const { target } = parsetarget(message.target)
  if (target === 'ticktock' || target === 'second') {
    return true
  }
  if (target === 'ready' || target === 'sessionreset') {
    return true
  }
  if (target === 'jsonsyncclient') {
    return true
  }
  if (message.target === 'jsonsync:changed') {
    return true
  }
  return false
}

function boardrunnershouldforwardinbound(raw: unknown): boolean {
  if (!ismessage(raw)) {
    return false
  }
  const message = raw as MESSAGE
  if (message.target === BOARDRUNNER_WORKER_SET_LOCAL_PLAYER) {
    boardrunnerlocalplayerid = isstring(message.data) ? message.data : ''
    return false
  }
  if (!boardrunnerlocalplayerid) {
    return true
  }
  if (!isstring(message.player) || message.player.length === 0) {
    return true
  }
  if (boardrunnerinboundallowsanyplayer(message)) {
    return true
  }
  return message.player === boardrunnerlocalplayerid
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
  const raw = event.data
  if (!boardrunnershouldforwardinbound(raw)) {
    return
  }
  forward(raw)
}
