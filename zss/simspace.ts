import 'zss/rom/vitepopulate'
import { setclimode } from 'zss/feature/detect'

import { createforward, shouldforwardservertoclient } from './device/forward'
import { started } from './device/vm'

// these are all back-end devices that operate within the web worker
import './device/clock'
import './device/gadgetserver'
import './device/jsonsyncserver'
import './device/modem'

const { forward } = createforward((message) => {
  if (shouldforwardservertoclient(message)) {
    postMessage(message)
  }
})

onmessage = function handleMessage(
  event: MessageEvent<{ target?: string; data?: any }>,
) {
  const msg = event.data
  if (msg?.target === 'config') {
    setclimode(!!msg?.data)
    return
  }
  forward(event.data)
}

// begin simspace
setTimeout(started, 100)
