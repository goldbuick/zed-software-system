import { hub } from 'zss/network/hub'

import './input'
import './tape'

const webworker = new Worker(
  new URL('../worker/hubworker.ts', import.meta.url),
  {
    type: 'module',
  },
)

hub.setSyncHandler((hubmessage) => {
  // console.info('hubmain sync handler', hubmessage)
  webworker.postMessage(hubmessage)
})

webworker.addEventListener('message', (event) => {
  // console.info('hubmain addEventListener', event.data)
  hub.sync(event.data)
})
