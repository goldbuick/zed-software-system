import { createdevice } from 'zss/device'
import { wanixhandlers } from 'zss/device/wanixserver/handlers/registry'

const wanixserver = createdevice('wanixserver', [], (message) => {
  if (!wanixserver.session(message)) {
    return
  }
  const handler = wanixhandlers[message.target]
  if (handler) {
    handler(wanixserver, message)
  }
})

export { wanixserver }
