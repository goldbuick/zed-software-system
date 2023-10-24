import { createOS } from 'zss/system/os'

import { GadgetFirmware } from '/zss/system/firmware/gadget'

import { MESSAGE, createDevice, createMessage } from '../device'

import { createJsonSyncServer } from './jsonsync'

const os = createOS()

const gadgetserver = createJsonSyncServer('gadgetserver')

const device = createDevice('worker', [], (message) => {
  switch (message.target.toLowerCase()) {
    case 'boot':
      device.send(createMessage('workerhost:boot', os.boot(message.data)))
      break
    case 'halt':
      device.send(createMessage('workerhost:halt', os.halt(message.data)))
      break
    case 'active':
      device.send(createMessage('workerhost:active', os.active(message.data)))
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
  console.info('fromParent', event.data)
  device.fromParent(event.data as MESSAGE)
}

// link in gadget sync
device.connect(gadgetserver.device)

const TICK_RATE = 66.666 // 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
// const TICK_FPS = Math.round(1000 / TICK_RATE)

// mainloop
function tick() {
  os.ids().forEach((id) => os.tick(id))
  // we need to sync gadget here
  gadgetserver.sync(GadgetFirmware.shared)
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
