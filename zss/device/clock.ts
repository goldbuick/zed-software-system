import { createdevice } from 'zss/device'
import { TICK_FPS, TICK_RATE } from 'zss/mapping/tick'

type TIMEOUT_FN = () => void

const timeouts: TIMEOUT_FN[] = []
const messageName = 'zed-clock-proc'

function schedule(fn: TIMEOUT_FN) {
  timeouts.push(fn)
  window.postMessage(messageName, '*')
}

window.addEventListener(
  'message',
  (event) => {
    if (event.source == window && event.data == messageName) {
      event.stopPropagation()
      const fn = timeouts.shift()
      fn?.()
    }
  },
  true,
)

const clockdevice = createdevice('clock', [], () => {
  // no-op
})

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

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    clockdevice.emit('tick', timestamp)
    clockdevice.emit('tock', timestamp)
    ++clock
    ++timestamp
    if (clock >= TICK_FPS) {
      clock %= TICK_FPS
      clockdevice.emit('second', timestamp)
    }
  }

  previous = now
  schedule(wake)
}

// server is ready
wake()
