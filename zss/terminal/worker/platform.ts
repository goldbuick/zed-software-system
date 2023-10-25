import { createOS } from 'zss/system/os'

import { createDevice } from '/zss/network/device'

const os = createOS()

const platform = createDevice('platform', [], (message) => {
  console.info({ message })
})

const TICK_RATE = 66.666 // 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
// const TICK_FPS = Math.round(1000 / TICK_RATE)

// mainloop
function tick() {
  os.ids().forEach((id) => os.tick(id))
  // we need to sync gadget here
}

// timer acc
let acc = 0
let previous = performance.now()
function wake() {
  const now = performance.now()
  const delta = now - previous

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    tick()
  }

  previous = now
  setTimeout(wake, 0)
}

// server is ready
wake()
