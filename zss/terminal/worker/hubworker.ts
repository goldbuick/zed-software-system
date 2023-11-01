import { hub } from 'zss/network/hub'

import './input'
import './platform'

onmessage = function handleMessage(event) {
  hub.sync(event.data)
}

hub.setSyncHandler((hubmessage) => {
  postMessage(hubmessage)
})

hub.emit('ready', 'hubworker')
