import { createDevice } from 'zss/network/device'

const device = createDevice('tick', [], () => {
  //
})

// main update tick
// 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
const TICK_RATE = 66.666
const TICK_FPS = Math.round(1000 / TICK_RATE)
console.info({ TICK_FPS })

// timer acc
let acc = 0
let previous = performance.now()

// timer trigger
function wake() {
  const now = performance.now()
  const delta = now - previous

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    device.emit('tick')
  }

  previous = now
  setTimeout(wake)
}

// server is ready
wake()
