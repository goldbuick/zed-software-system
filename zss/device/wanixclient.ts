import { createdevice } from 'zss/device'
import { vmwanixattach } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { shouldprocesswanixclientmessage } from 'zss/device/wanixclient/filter'
import { wanixclienthandlers } from 'zss/device/wanixclient/handlers/registry'
import {
  readattachedsession,
  subscribewanixattach,
} from 'zss/device/wanixclient/wanixdisplay'

export const wanixclient = createdevice('wanixclient', ['ready'], (message) => {
  if (!wanixclient.session(message)) {
    return
  }
  if (!shouldprocesswanixclientmessage(message)) {
    return
  }
  const handler = wanixclienthandlers[message.target]
  if (handler) {
    handler(wanixclient, message)
  }
})

subscribewanixattach(() => {
  vmwanixattach(SOFTWARE, registerreadplayer(), readattachedsession())
})
