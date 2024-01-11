import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { createDevice } from 'zss/network/device'

import { CONTENT_TYPE } from '../codepage'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
export const sessionId = `sid_${justNumberChars()}_${mixedChars()}`

const vm = createDevice('vm', [], (message) => {
  if (message.player) {
    switch (message.target) {
      case 'login':
        // const appgadget = select(vm.get('app:gadget'))
        // if (appgadget?.type === CONTENT_TYPE.CODE) {
        //   tracking[message.player] = 0
        //   vm.login(message.player)
        //   os.boot({
        //     group: message.player,
        //     firmware: LOGIN_SET,
        //     code: appgadget.code,
        //   })
        // }
        break

      case 'keydown':
        // console.info(message)
        break

      case 'doot':
        // tracking[message.player] = 0
        break

      case 'desync':
        // const state = gadgetstate(message.player)
        // platform.emit('gadgetclient:reset', state, message.player)
        break

      case 'clearscroll':
        // clearscroll(message.player)
        break

      default: //
        break
    }
    return
  }
  // os.message(message)
})

// 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
const TICK_RATE = 66.666
const TICK_FPS = Math.round(1000 / TICK_RATE)
console.info({ TICK_FPS })

// mainloop
const LOOP_TIMEOUT = 32 * 15

function tick() {
  // thing ?
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
