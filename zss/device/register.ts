import { createdevice } from 'zss/device'
import { shouldprocessregistermessage } from 'zss/device/register/filter'
import { registerhandlers } from 'zss/device/register/handlers/registry'
import { registersetmyplayerid } from 'zss/device/register/player'
import { registerreadplayer } from 'zss/device/registerplayer'
import 'zss/device/register/init'

export { registerreadplayer, registersetmyplayerid }

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
