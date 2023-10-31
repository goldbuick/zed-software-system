import * as jsonpatch from 'fast-json-patch'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'
import { STATE } from 'zss/system/chip'
import { GADGET_FIRMWARE } from 'zss/system/firmware/gadget'
import { createOS } from 'zss/system/os'

const os = createOS()

let gadgetstate: STATE = {}

const gadget = createDevice('gadgetserver', [], (message) => {
  switch (message.target) {
    case 'desync':
      hub.emit(
        'gadgetclient:reset',
        gadget.name(),
        GADGET_FIRMWARE.shared[message.playerId ?? ''],
        message.playerId,
      )
      break
  }
})

const platform = createDevice('platform', [], (message) => {
  switch (message.target) {
    case 'login':
      console.info(message)
      break
    case 'halt':
      os.halt(message.data)
      break
    case 'active':
      hub.emit(message.from, platform.name(), os.active())
      break
    default:
      os.message(message)
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
    hub.emit('gadgetclient:patch', gadget.name(), patch)
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

/*

I want to be able to run multiple chips to drive gadget based ui

chips should have names, default to object

we have to group chips "by board" by some context ?

we need to have codepages, with multiple entries and resource types

the codepage content needs to be accessible from webworker

*/
