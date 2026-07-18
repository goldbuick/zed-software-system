import { createmessage } from 'zss/device'
import { ismessage } from 'zss/device/types'
import { hub } from 'zss/hub'
import { isstring } from 'zss/mapping/types'

import './device/sttworker'

let joined = false

onmessage = function handleMessage(event: MessageEvent) {
  const msg = event.data
  if (msg?.target === 'config') {
    const cfg = msg?.data
    const session =
      cfg && typeof cfg === 'object' && isstring(cfg.session) ? cfg.session : ''
    if (!session || joined) {
      return
    }
    joined = true
    hub.join(session)
    hub.invokelocal(createmessage(session, '', 'platform', 'ready'))
    postMessage({ target: 'configack' })
    return
  }
  if (ismessage(msg)) {
    hub.invokelocal(msg)
  }
}
