import { GeneratorBuild, compile } from 'zss/lang/generator'
import { createGuid } from 'zss/mapping/guid'
import { MESSAGE_FUNC, parseTarget } from 'zss/network/device'

import { CHIP, createChip } from './chip'
import { GADGET_FIRMWARE } from './firmware/gadget'
import { loadFirmware } from './firmware/loader'

export type OS = {
  boot: (firmware: string, code: string) => string
  ids: () => string[]
  halt: (id: string) => boolean
  active: () => Record<string, boolean>
  tick: (id: string) => void
  send: MESSAGE_FUNC
  state: (id: string, name?: string) => Record<string, object>
}

export function createOS(): OS {
  const builds: Record<string, GeneratorBuild> = {}
  const chips: Record<string, CHIP> = {}

  function build(code: string) {
    const cache = builds[code]
    if (cache) {
      return cache
    }

    const result = compile(code)
    builds[code] = result

    return result
  }

  const os: OS = {
    boot(firmware, code) {
      const id = createGuid()

      const result = build(code)
      if (result.errors?.length) {
        // log it ???
        return ''
      }

      const chip = (chips[id] = createChip(result))
      loadFirmware(chip, firmware)

      return id
    },
    ids() {
      return Object.keys(chips)
    },
    halt(id) {
      const chip = chips[id]
      delete chips[id]
      return !!chip
    },
    active() {
      const chipstate: Record<string, boolean> = {}

      os.ids().forEach((id) => {
        chipstate[id] = chips[id]?.shouldtick() ?? false
      })

      return chipstate
    },
    tick(id) {
      chips[id]?.tick()
    },
    send(message) {
      const { target, path } = parseTarget(message.target)
      console.info('os send', { target, path, data: message.data })
    },
    state(id, name) {
      return chips[id]?.state(name) ?? {}
    },
  }

  return os
}
