import {
  DEVICE,
  MESSAGE,
  createDevice,
  createMessage,
} from 'zss/network/device'

import { createJsonSyncClient, JSON_SYNC_CLIENT_CHANGE_FUNC } from './jsonsync'

export type WORKER_HOST = {
  device: DEVICE
  destroy: () => void
}

export function createWorkerHost(
  bootcode: string,
  onChange: JSON_SYNC_CLIENT_CHANGE_FUNC,
) {
  const webworker = new Worker(new URL('worker.ts', import.meta.url), {
    type: 'module',
  })

  function sendToWebWorker(message: MESSAGE) {
    webworker.postMessage(device.updateOrigin(message))
  }

  const gadgetclient = createJsonSyncClient('gadgetclient', onChange)

  const device = createDevice('workerhost', [], (message) => {
    switch (message.target.toLowerCase()) {
      case 'ready':
        // subscribe
        gadgetclient.subscribe('workerhost:gadgetserver')
        // send worker boot code
        sendToWebWorker(createMessage('worker:boot', bootcode))
        break
      case 'boot':
        break
      case 'halt':
        break
      case 'active':
        break
      default:
        // forward to worker
        sendToWebWorker(message)
        break
    }
  })

  device.connect(gadgetclient.device)

  webworker.addEventListener('message', (event) => {
    // console.info('fromWorker', event.data)
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
