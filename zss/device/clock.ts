import { createdevice } from 'zss/device'
import { TICK_FPS, TICK_RATE } from 'zss/mapping/tick'

const clockdevice = createdevice('clock', [], () => {})

// tracking
let clock = 0
let timestamp = 0

// timer acc
let acc = 0
let previous = performance.now()

// timer trigger
function wake() {
  const now = performance.now()
  const delta = now - previous
  const islocked = window.location.href.includes(`/locked/`) ? 'locked' : ''

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    clockdevice.emit('tick', timestamp, islocked)
    clockdevice.emit('tock', timestamp, islocked)
    ++clock
    ++timestamp
    if (clock >= TICK_FPS) {
      clock %= TICK_FPS
      clockdevice.emit('second', timestamp, islocked)
    }
  }

  previous = now
  setTimeout(wake, 1)
}

// start clock
wake()
