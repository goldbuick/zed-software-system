import { createmessage } from 'zss/device'
import { hub } from 'zss/hub'
import { isstring } from 'zss/mapping/types'

import './device/modem'
import './device/boardrunner'
import './perf/perfreport'

let joined = false

onmessage = function handleMessage(
  event: MessageEvent<{ target?: string; data?: any }>,
) {
  const msg = event.data
  if (msg?.target !== 'config') {
    return
  }
  const cfg = msg?.data
  const session =
    cfg && typeof cfg === 'object' && isstring(cfg.session) ? cfg.session : ''
  if (!session || joined) {
    return
  }
  joined = true
  hub.join(session)
  // Latch device sessions if the tab already broadcast ready before we joined.
  hub.invokelocal(createmessage(session, '', 'platform', 'ready'))
  postMessage({ target: 'configack' })
}
