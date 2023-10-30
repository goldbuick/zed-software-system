import { GeneratorBuild, compile } from 'zss/lang/generator'
import { createGuid } from 'zss/mapping/guid'
import { MESSAGE_FUNC, parseTarget } from 'zss/network/device'

import { CHIP, createChip } from './chip'
import { loadFirmware } from './firmware/loader'

export type OS = {
  boot: (opts: { group: string; firmware: string; code: string }) => string
  ids: () => string[]
  halt: (id: string) => boolean
  active: () => Record<string, boolean>
  tick: (id: string) => void
  message: MESSAGE_FUNC
  state: (id: string, name?: string) => Record<string, object>
}

export function createOS(): OS {
  const builds: Record<string, GeneratorBuild> = {}
  const chips: Record<string, CHIP> = {}
  const groups: Record<string, Set<CHIP>> = {}

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
    boot(opts) {
      const id = createGuid()
      const group = opts.group.toLowerCase()

      const result = build(opts.code)
      if (result.errors?.length) {
        // log it ???
        return ''
      }

      // create chip from build and load
      const chip = (chips[id] = createChip(id, result))
      loadFirmware(chip, opts.firmware)

      // make sure we have a set to add to
      groups[group] = groups[group] || new Set()
      groups[group].add(chip)

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
    message(incoming) {
      const { target, path } = parseTarget(incoming.target)
      const itarget = target.toLowerCase()

      // check group
      if (groups[itarget]) {
      }

      // check id / name
      os.ids().forEach((id) => {
        if (itarget === id) {
          chips[id].message({ ...incoming, target: path })
        }
      })

      // console.info('os message', { target, path, data: message.data })
    },
    state(id, name) {
      return chips[id]?.state(name) ?? {}
    },
  }

  return os
}
