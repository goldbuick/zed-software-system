import { hub } from 'zss/network/hub'

import './input'
import './platform'

onmessage = function handleMessage(event) {
  // console.info('hubworker onmessage', event.data)
  hub.sync(event.data)
}

hub.setSyncHandler((hubmessage) => {
  // console.info('hubworker sync handler', hubmessage)
  postMessage(hubmessage)
})

hub.emit('ready', 'hubworker')
