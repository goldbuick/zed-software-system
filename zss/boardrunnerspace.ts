import { agentlog } from 'zss/agentlog'
import { WASM_SCRIPT } from 'zss/config'
import { initlangcompile } from 'zss/feature/lang/langcompileclient'
import {
  createforward,
  shouldforwardboardrunnertoclient,
} from 'zss/device/forward'

import './device/modem'
import './device/boardrunner'
import './perf/perfreport'

const { forward } = createforward((message) => {
  if (shouldforwardboardrunnertoclient()) {
    postMessage(message)
  }
})

const langready = initlangcompile().then(() => {
  agentlog(
    'boardrunnerspace.ts:started',
    'worker lang init done',
    { wasmscript: WASM_SCRIPT, runId: 'post-fix2' },
    'H',
  )
})

onmessage = function handleMessage(event) {
  void langready.then(() => forward(event.data))
}
