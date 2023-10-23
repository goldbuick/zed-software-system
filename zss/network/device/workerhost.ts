import {
  MESSAGE,
  MESSAGE_FUNC,
  createDevice,
  createMessage,
} from 'zss/network/device'

export type WORKER_HOST = {
  linkParent: (handler: MESSAGE_FUNC) => void
  send: (message: MESSAGE) => void
  destroy: () => void
}

export function createWorkerHost(bootcode: string) {
  const webworker = new Worker(new URL('worker.ts', import.meta.url), {
    type: 'module',
  })

  function sendToWebWorker(message: MESSAGE) {
    console.info('sendToWebWorker', message)
    webworker.postMessage(message)
  }

  const device = createDevice('workerhost', [], (message) => {
    switch (message.target.toLowerCase()) {
      case 'ready':
        // send worker boot code
        sendToWebWorker(createMessage('worker:boot', bootcode))
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
    linkParent(handler) {
      device.linkParent(handler)
    },
    send(message) {
      device.send(message)
    },
    destroy() {
      webworker.terminate()
    },
  }

  return workerhost
}
