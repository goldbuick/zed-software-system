import 'zss/rom/vitepopulate'
import { debugingest } from 'zss/debugingest'
import { setclimode } from 'zss/feature/detect'
import { hub } from 'zss/hub'
import { isstring } from 'zss/mapping/types'
import { memorywritesession } from 'zss/memory/session'

// back-end devices that operate within the web worker (vm loads after config)
import './device/clock'
import './device/modem'
import './perf/perfreport'

let started = false

onmessage = function handleMessage(
  event: MessageEvent<{ target?: string; data?: any }>,
) {
  const msg = event.data
  if (msg?.target !== 'config') {
    return
  }
  const cfg = msg?.data
  const climode = cfg && typeof cfg === 'object' ? !!cfg.climode : !!cfg
  setclimode(climode)

  const session =
    cfg && typeof cfg === 'object' && isstring(cfg.session) ? cfg.session : ''
  if (!session || started) {
    return
  }
  started = true
  memorywritesession(session)
  hub.join(session)
  postMessage({ target: 'configack' })

  debugingest(
    'simspace.ts:started',
    'worker starting vm',
    { runId: 'post-fix' },
    'G',
  )
  void import('zss/device/vm').then(({ started: startvm }) => {
    startvm()
  })
}
