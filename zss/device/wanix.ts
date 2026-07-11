import { createdevice } from 'zss/device'
import { wanixhandlers } from 'zss/device/wanix/handlers/registry'

const wanix = createdevice('wanix', [], (message) => {
  if (!wanix.session(message)) {
    return
  }
  const handler = wanixhandlers[message.target]
  if (handler) {
    handler(wanix, message)
  }
})

export { wanix }
