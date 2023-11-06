import * as jsonpatch from 'fast-json-patch'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'
import { STATE } from 'zss/system/chip'
import { GADGET_FIRMWARE, gadgetState } from 'zss/system/firmware/gadget'
import { createOS } from 'zss/system/os'

const os = createOS()

// tracking active player ids
const tracking: Record<string, number> = {}

// tracking gadget state for individual players
const syncstate: Record<string, STATE> = {}

const gadget = createDevice('gadgetserver', [], (message) => {
  switch (message.target) {
    case 'desync':
      if (message.playerId) {
        const state = gadgetState(GADGET_FIRMWARE.shared, message.playerId)
        hub.emit('gadgetclient:reset', gadget.name(), state, message.playerId)
      }
      break
  }
})

const platform = createDevice('platform', [], (message) => {
  // console.info(message)
  switch (message.target) {
    case 'login':
      if (message.playerId) {
        tracking[message.playerId] = 0
        // this is a function of creating a new chip
        // group for the player, and then starting a chip for them
      }
      break
    case 'doot':
      if (message.playerId) {
        tracking[message.playerId] = 0
      }
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
// const TICK_FPS = Math.round(1000 / TICK_RATE)

// mainloop
const LOOP_TIMEOUT = 32 * 15
function tick() {
  // tick player groups, and drop dead players
  Object.keys(tracking).forEach((playerId) => {
    tracking[playerId] = (tracking[playerId] ?? 0) + 1
    if (tracking[playerId] > LOOP_TIMEOUT) {
      console.error('discard', playerId, tracking[playerId])
      // nuke it
      os.haltGroup(playerId)
      delete tracking[playerId]
      delete syncstate[playerId]
    } else {
      // tick group
      os.tickGroup(playerId)
      // we need to sync gadget here
      const shared = gadgetState(GADGET_FIRMWARE.shared, playerId)
      const patch = jsonpatch.compare(syncstate[playerId] ?? {}, shared)
      if (patch.length) {
        syncstate[playerId] = jsonpatch.deepClone(shared)
        hub.emit('gadgetclient:patch', gadget.name(), patch, playerId)
      }
    }
  })

  // tick active board groups
  // TODO: write this ...
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
  setTimeout(wake)
}

// server is ready
wake()
