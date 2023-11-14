import { hub } from 'zss/network/hub'

import './input'
import './playerId'
import './gadgetclient'

const webworker = new Worker(
  new URL('../worker/hubworker.ts', import.meta.url),
  {
    type: 'module',
  },
)

hub.setSyncHandler((hubmessage) => {
  webworker.postMessage(hubmessage)
})

webworker.addEventListener('message', (event) => {
  hub.sync(event.data)
})
