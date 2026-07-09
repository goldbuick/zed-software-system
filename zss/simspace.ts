import 'zss/rom/vitepopulate'
import { debugingest } from 'zss/debugingest'
import { setclimode } from 'zss/feature/detect'

import { createforward, shouldforwardservertoclient } from './device/forward'
import { started } from './device/vm'

// these are all back-end devices that operate within the web worker
import './device/clock'
import './device/modem'
import './perf/perfreport'

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
    const cfg = msg?.data
    if (cfg && typeof cfg === 'object') {
      setclimode(!!cfg.climode)
    } else {
      setclimode(!!cfg)
    }
    return
  }
  forward(event.data)
}

debugingest(
  'simspace.ts:started',
  'worker starting vm',
  { runId: 'post-fix' },
  'G',
)
started()
