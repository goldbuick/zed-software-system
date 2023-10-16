import { createDevice } from '../device'

function onParent(message: string, data: any) {
  postMessage([message, data])
}

const device = createDevice('worker', [], onParent, (message, data) => {
  console.info({ message, data })
})

onmessage = function handleMessage(event) {
  const [message, data] = event.data
  device.handle(message, data)
}
