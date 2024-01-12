import { hub } from 'zss/network/hub'

import './worker/clock'
import './worker/gadgetworker'
import './worker/vm'

onmessage = function handleMessage(event) {
  hub.sync(event.data)
}

hub.setSyncHandler((hubmessage) => {
  postMessage(hubmessage)
})

// signal front-end
hub.emit('ready', 'hubworker')
