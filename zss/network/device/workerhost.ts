import {
  DEVICE,
  MESSAGE,
  MESSAGE_FUNC,
  createDevice,
  createMessage,
} from '../device'

export type WORKER_HOST = {
  linkParent: (handler: MESSAGE_FUNC) => void
  send: (message: MESSAGE) => void
  device: () => DEVICE
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
    switch (message.target) {
      case 'ready':
        sendToWebWorker(createMessage('worker:boot', bootcode))
        break
      default:
        // flag unsupported message
        break
    }
  })

  webworker.addEventListener('message', (event) => {
    device.send(event.data as MESSAGE)
  })

  const workerhost: WORKER_HOST = {
    linkParent(handler) {
      device.linkParent(handler)
    },
    send(message) {
      device.send(message)
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
