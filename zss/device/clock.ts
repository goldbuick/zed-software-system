import { createdevice } from 'zss/device'
import { TICK_RATE } from 'zss/mapping/tick'
import { isperfdevbuild, readtickstats } from 'zss/perf/ticktimingstats'

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
  const t0 = isperfdevbuild() ? performance.now() : 0
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
  if (isperfdevbuild()) {
    const elapsed = performance.now() - t0
    if (elapsed > 16) {
      // eslint-disable-next-line no-console -- dev-only slow wake diagnosis
      console.log(
        `[zss perf] slow wake ${elapsed.toFixed(1)}ms`,
        readtickstats().stages,
      )
    }
  }
  setTimeout(wake, delay)
}

// start clock
wake()
