import {
  DEVICE,
  MESSAGE,
  createDevice,
  createMessage,
} from 'zss/network/device'

export type WORKER_HOST = {
  device: DEVICE
  destroy: () => void
}

export function createWorkerHost(bootcode: string) {
  const webworker = new Worker(new URL('worker.ts', import.meta.url), {
    type: 'module',
  })

  function sendToWebWorker(message: MESSAGE) {
    webworker.postMessage(message)
  }

  const device = createDevice('workerhost', [], (message) => {
    switch (message.target.toLowerCase()) {
      case 'ready':
        // send worker boot code
        sendToWebWorker(createMessage('worker:boot', bootcode))
        break
      case 'boot':
        console.info('did boot', message.data)
        break
      case 'halt':
        break
      case 'active':
        break
      default:
        // show unsupported message
        console.info(message)
        break
    }
  })

  webworker.addEventListener('message', (event) => {
    device.send(event.data as MESSAGE)
  })

  const workerhost: WORKER_HOST = {
    device,
    destroy() {
      webworker.terminate()
    },
  }

  return workerhost
}
