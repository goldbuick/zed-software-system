import { DEVICE, MESSAGE_FUNC, createDevice } from '../device'

export type WORKER = {
  device: () => DEVICE
  destroy: () => void
}

export function createWorker(onParent: MESSAGE_FUNC): WORKER {
  const webworker = new Worker(new URL('worker.js', import.meta.url), {
    type: 'module',
  })

  const device = createDevice('worker', [], onParent, (message, data) => {
    webworker.postMessage([message, data])
  })

  const worker: WORKER = {
    device() {
      return device
    },
    destroy() {
      webworker.terminate()
    },
  }

  return worker
}

/*

this network device runs a rack in a webworker

*/
