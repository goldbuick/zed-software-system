import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import { setassignedplayer } from './device/boardrunner'
import './device/gadgetmemoryprovider'
import './device/modem'
import { rxreplclientsetownplayer } from './device/rxreplclient'

import { isstring } from './mapping/types'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  const msg = event.data
  if (msg?.target === 'registerplayer') {
    const player = msg.data?.player
    if (isstring(player) && player.length > 0) {
      setassignedplayer(player)
      rxreplclientsetownplayer(player)
    }
    return
  }
  forward(msg)
}
