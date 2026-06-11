import { createforward, shouldforwardheavytoclient } from 'zss/device/forward'
import { installheavygpudisposereplies } from 'zss/feature/gpu/gpuheavyload'
import { initgpumodelbudget } from 'zss/feature/gpu/gpumodelbudget'
import { ensuregpuworkerbridge } from 'zss/feature/gpu/gpuworkerbridge'

ensuregpuworkerbridge()
installheavygpudisposereplies()
void initgpumodelbudget()

import './device/heavy'

const { forward } = createforward((message) => {
  if (shouldforwardheavytoclient()) {
    postMessage(message)
  }
})

onmessage = function handleMessage(event) {
  forward(event.data)
}
