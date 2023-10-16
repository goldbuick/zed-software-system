import { FIRMWARE } from '/zss/lang/firmware'

import { GadgetFirmware } from '/zss/gadget'
import { createOS } from '/zss/os'

import { createDevice } from '../device'

const os = createOS()

const firmwares: FIRMWARE[] = [GadgetFirmware]

const device = createDevice('worker', [], (message, data) => {
  switch (message.toLowerCase()) {
    case 'boot':
      device.send('workerhost:chipboot', os.boot(data, ...firmwares))
      break
    case 'halt':
      device.send('workerhost:chiphalt', os.halt(data))
      break
    case 'active':
      device.send('workerhost:chipactive', os.active(data))
      break
    default:
      // error unknown message ?
      break
  }
})

device.linkParent((message, data) => {
  postMessage([message, data])
})

onmessage = function handleMessage(event) {
  const [message, data] = event.data
  device.fromParent(message, data)
}

device.send('workerhost:ready', undefined)
