import { createdevice } from 'zss/device'
import { TICK_FPS, TICK_RATE } from 'zss/mapping/tick'
import { islocked } from 'zss/mapping/url'

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
  const locked = islocked() ? 'locked' : ''

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    clockdevice.emit('tick', timestamp, locked)
    clockdevice.emit('tock', timestamp, locked)
    ++clock
    ++timestamp
    if (clock >= TICK_FPS) {
      clock %= TICK_FPS
      clockdevice.emit('second', timestamp, locked)
    }
  }

  previous = now
  setTimeout(wake, 1)
}

// start clock
wake()
