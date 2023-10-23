import { FIRMWARE } from '/zss/firmware/firmware'
import { createOS } from '/zss/firmware/os'

import { GadgetFirmware } from '/zss/gadget'

import { MESSAGE, createMessage } from '../network/device'

import { createPublisher } from './pubsub'

const os = createOS()

const firmwares: FIRMWARE[] = [GadgetFirmware]

const device = createPublisher('worker', (message) => {
  switch (message.target.toLowerCase()) {
    case 'boot':
      device.send(
        createMessage(
          'workerhost:chipboot',
          os.boot(message.data, ...firmwares),
        ),
      )
      break
    case 'halt':
      device.send(createMessage('workerhost:chiphalt', os.halt(message.data)))
      break
    case 'active':
      device.send(
        createMessage('workerhost:chipactive', os.active(message.data)),
      )
      break
    default:
      // error unknown message ?
      break
  }
})

device.linkParent((message) => {
  postMessage(message)
})

onmessage = function handleMessage(event) {
  device.fromParent(event.data as MESSAGE)
}

const TICK_RATE = 66.666 // 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
// const TICK_FPS = Math.round(1000 / TICK_RATE)

// mainloop
function tick() {
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
    tick()
  }

  previous = now
  setTimeout(wake, 0)
}

// server is ready
wake()
device.send(createMessage('workerhost:ready'))

/*

We need a way for multiple chips to write to gadget
since we are only syncing one data model for gadget
we do not need multiple pub / sub for it

so in this case firmware should also have singleton state

because after each tick, we sync() on changes to the gadget data model

*/
