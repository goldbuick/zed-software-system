import * as jsonpatch from 'fast-json-patch'
import { select } from 'zss/mapping/array'
import { createDevice } from 'zss/network/device'
import { hub } from 'zss/network/hub'
import { STATE } from 'zss/system/chip'
import { GADGET_FIRMWARE, gadgetState } from 'zss/system/firmware/gadget'
import { createOS } from 'zss/system/os'
import { createVM } from 'zss/system/vm'

import { CODE_PAGE_TYPE } from '/zss/system/codepage'

import { TAPE_PAGES } from './tape/content'

const os = createOS()
const vm = createVM()

// load default software
vm.load(TAPE_PAGES)

// tracking active player ids
const tracking: Record<string, number> = {}

// tracking gadget state for individual players
const syncstate: Record<string, STATE> = {}

const gadget = createDevice('gadgetserver', [], (message) => {
  // console.info(message)
  switch (message.target) {
    case 'desync':
      if (message.playerId) {
        const state = gadgetState(GADGET_FIRMWARE.shared, message.playerId)
        hub.emit('gadgetclient:reset', gadget.name(), state, message.playerId)
      }
      break
  }
})

createDevice('platform', [], (message) => {
  // console.info(message)
  switch (message.target) {
    case 'login':
      if (message.playerId) {
        const appgadget = select(vm.get('app:gadget'))
        if (appgadget?.type === CODE_PAGE_TYPE.CODE) {
          tracking[message.playerId] = 0
          vm.login(message.playerId)
          os.boot({
            group: message.playerId,
            firmware: 'gadget',
            code: appgadget.code,
          })
        }
      }
      break
    case 'doot':
      if (message.playerId) {
        tracking[message.playerId] = 0
      }
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
  // tick active board groups
  vm.active().forEach((boardId) => {
    //
  })

  // tick player groups, and drop dead players
  Object.keys(tracking).forEach((playerId) => {
    // tick group
    os.tickGroup(playerId)

    // inc player idle time
    tracking[playerId] = tracking[playerId] || 0
    ++tracking[playerId]

    // nuke it after too many ticks without a doot
    if (tracking[playerId] > LOOP_TIMEOUT) {
      vm.logout(playerId)
      os.haltGroup(playerId)
      delete tracking[playerId]
      delete syncstate[playerId]
      return
    }
    // we need to render each player view
  })

  // we need to sync gadget here
  Object.keys(tracking).forEach((playerId) => {
    const shared = gadgetState(GADGET_FIRMWARE.shared, playerId)
    const patch = jsonpatch.compare(syncstate[playerId] ?? {}, shared)
    if (patch.length) {
      syncstate[playerId] = jsonpatch.deepClone(shared)
      hub.emit('gadgetclient:patch', gadget.name(), patch, playerId)
    }
  })
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
