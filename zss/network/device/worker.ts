import { FIRMWARE } from '/zss/lang/firmware'
import { createOS } from '/zss/lang/os'

import { GadgetFirmware } from '/zss/gadget'

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

const TICK_RATE = 66.666 // 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
const TICK_FPS = Math.round(1000 / TICK_RATE)

console.info({ TICK_FPS })

// mainloop
// const frame = 0
function tick() {
  // console.info('tick', frame++)
  os.ids().forEach((id) => os.tick(id))
}

// timer acc
let acc = 0
let previous = performance.now()
function wake() {
  const now = performance.now()
  const delta = now - previous

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    queueMicrotask(tick)
  }

  previous = now
  queueMicrotask(wake)
}

// server is ready
wake()
device.send('workerhost:ready', undefined)
