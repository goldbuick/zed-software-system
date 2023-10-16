import { createOS } from '/zss/os'

import { DEVICE, createDevice } from '../device'

export type RACK = {
  device: () => DEVICE
  boot: (code: string) => string
  halt: (id: string) => boolean
  active: (id: string) => boolean
  tick: (id: string) => void
  state: (id: string, name?: string) => Record<string, object>
}

export function createRack() {
  const os = createOS()
  const device = createDevice('rack', [], (message, data) => {
    console.info('rack', { message, data })
  })

  const rack: RACK = {
    device() {
      return device
    },
    boot(code) {
      return os.boot(code)
    },
    halt(id) {
      return os.halt(id)
    },
    active(id) {
      return os.active(id)
    },
    tick(id) {
      os.tick(id)
    },
    state(id, name) {
      return os.state(id, name)
    },
  }

  return rack
}
