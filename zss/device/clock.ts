import { createdevice } from 'zss/device'
import { TICK_RATE } from 'zss/mapping/tick'

const clockdevice = createdevice('clock')

const MIN_TIMER_MS = 1

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
  while (acc >= TICK_RATE) {
    acc -= TICK_RATE
    clockdevice.emit('', 'ticktock', timestamp)
    ++timestamp
  }

  second += delta
  while (second >= 1000) {
    second -= 1000
    clockdevice.emit('', 'second', timestamp)
  }

  previous = now

  const totick = TICK_RATE - acc
  const tosecond = 1000 - second
  const delay = Math.max(MIN_TIMER_MS, Math.min(totick, tosecond))
  setTimeout(wake, delay)
}

// start clock
wake()
