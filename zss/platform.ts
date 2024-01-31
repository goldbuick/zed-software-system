import { createforward } from './device/forward'

// devices that operate within web main
import './device/gadgetclient'
import './device/shared'

const instance = new Worker(new URL('./instance.ts', import.meta.url), {
  type: 'module',
})

const forward = createforward((message) => instance.postMessage(message))

instance.addEventListener('message', (event) => {
  forward(event.data)
})
