import { DEVICE, parseMessage } from '../device'

const devices: DEVICE[] = []

onmessage = function handleMessage(event) {
  const [msg, data] = event.data

  // route to target device
  const { target } = parseMessage(msg)
  devices.forEach((device) => {
    if (device.match(target)) {
      device.send(msg, data)
    }
  })

  // console.info({ target, path, data })
}
