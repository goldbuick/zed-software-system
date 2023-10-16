import { DEVICE, MESSAGE_FUNC, createDevice } from '../device'

export type WORKER_HOST = {
  setParentHandler: (handler: MESSAGE_FUNC) => void
  send: (message: string, data: any) => void
  device: () => DEVICE
  destroy: () => void
}

export function createWorkerHost(bootcode: string, bootdata: any) {
  const webworker = new Worker(new URL('worker.ts', import.meta.url), {
    type: 'module',
  })

  function sendToWebWorker(message: string, data: any) {
    webworker.postMessage([message, data])
  }

  const device = createDevice('workerhost', [], (message, data) => {
    switch (message) {
      case 'ready':
        sendToWebWorker(bootcode, bootdata)
        break
      default:
        // flag unsupported message
        break
    }
  })

  webworker.addEventListener('message', (event) => {
    const [message, data] = event.data
    device.send(message, data)
  })

  const workerhost: WORKER_HOST = {
    setParentHandler(handler) {
      device.linkParent(handler)
    },
    send(message, data) {
      device.send(message, data)
    },
    device() {
      return device
    },
    destroy() {
      webworker.terminate()
    },
  }

  return workerhost
}
