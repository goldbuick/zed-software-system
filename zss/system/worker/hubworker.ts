import { hub } from 'zss/network/hub'

import './platform'

onmessage = function handleMessage(event) {
  hub.sync(event.data)
}

hub.setSyncHandler((hubmessage) => {
  postMessage(hubmessage)
})

// signal front-end
hub.emit('ready', 'hubworker')
