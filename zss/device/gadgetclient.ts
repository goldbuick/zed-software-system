import { createdevice } from 'zss/device'

import { registerreadplayer } from './register'

/** Device shell kept for session wiring; gadget UI updates use RxDB (gadgetrxsubscribe). */
export const gadgetclientdevice = createdevice(
  'gadgetclient',
  [],
  (message) => {
    if (!gadgetclientdevice.session(message)) {
      return
    }
    if (message.player !== registerreadplayer()) {
      return
    }
  },
)
