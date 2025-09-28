import { createdevice } from 'zss/device'
import { TICK_RATE } from 'zss/mapping/tick'

const clockdevice = createdevice('clock')

// tracking
let timestamp = 0

// timer acc
let acc = 0
let second = 0
let previous = performance.now()

// timer trigger
function wake() {
  const now = performance.now()
  const delta = now - previous

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    clockdevice.emit('', 'tick', timestamp)
    clockdevice.emit('', 'tock', timestamp)
    ++timestamp
  }

  second += delta
  if (second >= 1000) {
    second -= 1000
    clockdevice.emit('', 'second', timestamp)
  }

  previous = now
  setTimeout(wake, 2)
}

// start clock
wake()
