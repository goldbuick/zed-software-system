import { createdevice } from 'zss/device'
import { vmwanixattach } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { wanixuihandlers } from 'zss/device/wanixui/handlers/registry'
import {
  readattachedsession,
  subscribewanixattach,
} from 'zss/feature/wanix/wanixattachstate'

const wanixui = createdevice('wanixui', [], (message) => {
  if (!wanixui.session(message)) {
    return
  }
  const player = registerreadplayer()
  // empty player = iframe/system request (e.g. requestzedcafestate)
  if (message.player && message.player !== player) {
    return
  }
  const handler = wanixuihandlers[message.target]
  if (handler) {
    handler(wanixui, message)
  }
})

subscribewanixattach(() => {
  vmwanixattach(SOFTWARE, registerreadplayer(), readattachedsession())
})

export { wanixui }
