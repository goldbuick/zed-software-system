import { createdevice } from 'zss/device'
import { TICK_FPS, TICK_RATE } from 'zss/mapping/tick'

const clockdevice = createdevice('clock', [], () => {
  // no-op
})

// timer acc
let acc = 0
let previous = performance.now()

// tracking
let clock = 0
let timestamp = 0
function tick() {
  clockdevice.emit('tick', timestamp)
  clockdevice.emit('tock', timestamp)
  ++clock
  ++timestamp
  if (clock >= TICK_FPS) {
    clock %= TICK_FPS
    clockdevice.emit('second', timestamp)
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
