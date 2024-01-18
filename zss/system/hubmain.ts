import { hub } from 'zss/network/hub'

import './device/gadgetmain'

const webworker = new Worker(new URL('./hubworker.ts', import.meta.url), {
  type: 'module',
})

webworker.addEventListener('message', (event) => {
  hub.sync(event.data)
})

hub.setSyncHandler((hubmessage) => {
  webworker.postMessage(hubmessage)
})
