import { hub } from 'zss/network/hub'

import './device/clockworker'
import './device/gadgetworker'
import { ready } from './device/vmworker'

onmessage = function handleMessage(event) {
  hub.sync(event.data)
}

hub.setSyncHandler((hubmessage) => {
  postMessage(hubmessage)
})

ready()
