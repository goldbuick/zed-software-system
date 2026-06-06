import 'zss/rom/vitepopulate'
import { agentlog } from 'zss/agentlog'
import { setclimode } from 'zss/feature/detect'
import { initlangcompile } from 'zss/feature/lang/langcompileclient'

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
    setclimode(!!msg?.data)
    return
  }
  forward(event.data)
}

// begin simspace — chips compile in this worker; await lang compiler before VM tick
initlangcompile()
  .then(() => {
    agentlog(
      'simspace.ts:started',
      'worker lang init done, starting vm',
      { runId: 'post-fix' },
      'G',
    )
    started()
  })
  .catch((err) => {
    agentlog(
      'simspace.ts:started',
      'worker lang init failed',
      { error: String(err), runId: 'post-fix' },
      'G',
    )
  })
