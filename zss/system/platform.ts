import { createforward } from 'zss/device/forward'

// devices that operate within web main
import 'zss/device/gadgetclient'
import 'zss/device/shared'

const instance = new Worker(new URL('./instance.ts', import.meta.url), {
  type: 'module',
})

const forward = createforward((message) => instance.postMessage(message))

instance.addEventListener('message', (event) => {
  forward(event.data)
})
