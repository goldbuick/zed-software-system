import * as jsonpatch from 'fast-json-patch'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'
import { GADGET_FIRMWARE } from 'zss/system/firmware/gadget'
import { createOS } from 'zss/system/os'

import { STATE } from '/zss/system/chip'

const os = createOS()

let gadgetstate: STATE = {}

createDevice('gadgetserver', [], (message) => {
  switch (message.target) {
    case 'desync':
      hub.emit('gadgetclient:reset', GADGET_FIRMWARE.shared)
      break
  }
})

createDevice('platform', [], (message) => {
  switch (message.target) {
    case 'boot':
      os.boot(message.data)
      break
    case 'halt':
      os.halt(message.data)
      break
    case 'active':
      if (message.reply) {
        hub.emit(message.reply, os.active())
      }
      break
  }
})

const TICK_RATE = 66.666 // 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
const TICK_FPS = Math.round(1000 / TICK_RATE)

console.info('running at', TICK_FPS, 'fps')

// mainloop
function tick() {
  // tick all chips
  os.ids().forEach((id) => os.tick(id))

  // we need to sync gadget here
  const patch = jsonpatch.compare(gadgetstate, GADGET_FIRMWARE.shared)
  if (patch.length) {
    gadgetstate = jsonpatch.deepClone(GADGET_FIRMWARE.shared)
    hub.emit('gadgetclient:patch', patch)
  }
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
