import { createdevice } from 'zss/device'
import { TICK_FPS, TICK_RATE } from 'zss/mapping/tick'

const clockdevice = createdevice('clock', [], () => {
  // no-op
})

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
