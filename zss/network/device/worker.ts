import { createDevice } from '../device'

const device = createDevice('webworker', [], (message, data) => {
  switch (message.toLowerCase()) {
    case 'run':
      console.info(data)
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
