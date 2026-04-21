import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import { setassignedplayer } from './device/boardrunner'
import './device/rxreplclient'
import './device/gadgetmemoryprovider'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  const msg = event.data
  if (msg?.target === 'registerplayer') {
    setassignedplayer(msg.data.player)
    return
  }
  forward(msg)
}
