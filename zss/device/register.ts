import { createdevice } from 'zss/device'
import { vmwanixattach } from 'zss/device/api'
import { shouldprocessregistermessage } from 'zss/device/register/filter'
import { registerhandlers } from 'zss/device/register/handlers/registry'
import 'zss/device/register/init'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  readattachedsession,
  subscribewanixattach,
} from 'zss/device/register/handlers/wanix/wanixdisplay'

export const register = createdevice(
  'register',
  ['ready', 'second', 'sessionreset', 'log', 'chat', 'toast', 'workstatus'],
  (message) => {
    if (!register.session(message)) {
      return
    }
    if (!shouldprocessregistermessage(message)) {
      return
    }
    const handler = registerhandlers[message.target]
    if (handler) {
      handler(register, message)
    }
  },
)

subscribewanixattach(() => {
  vmwanixattach(SOFTWARE, registerreadplayer(), readattachedsession())
})
