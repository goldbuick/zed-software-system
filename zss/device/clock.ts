import { createdevice } from 'zss/device'

const clockdevice = createdevice('clock', [], () => {
  // no-op
})

// 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
// const TICK_RATE = 66.666
// const TICK_RATE = 33.333
const TICK_RATE = 50
const TICK_FPS = Math.round(1000 / TICK_RATE)

// timer acc
let acc = 0
let previous = performance.now()

let clock = 0
function tick() {
  clockdevice.emit('tick')
  clockdevice.emit('tock')
  ++clock
  if (clock >= TICK_FPS) {
    clock %= TICK_FPS
    clockdevice.emit('second')
  }
}

// timer trigger
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
