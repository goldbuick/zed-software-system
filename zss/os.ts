import { CHIP, createchip } from './chip'
import { MESSAGE_FUNC, parsetarget } from './device'
import { loadfirmware } from './firmware/loader'
import { GeneratorBuild, compile } from './lang/generator'
import { isdefined, ispresent } from './mapping/types'

export type OS = {
  ids: () => string[]
  has: (id: string) => boolean
  halt: (id: string) => boolean
  tick: (id: string, code: string) => boolean
  message: MESSAGE_FUNC
}

export function createos() {
  const builds: Record<string, GeneratorBuild> = {}
  const chips: Record<string, CHIP | null> = {}

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
    ids() {
      return Object.keys(chips)
    },
    has(id) {
      return isdefined(chips[id])
    },
    halt(id) {
      const chip = chips[id]
      if (chip) {
        delete chips[id]
      }
      return !!chip
    },
    tick(id, code) {
      let chip = chips[id]

      if (!isdefined(chips[id])) {
        const result = build(code)
        if (result.errors?.length) {
          console.error(result.errors)
          console.info(result.tokens)
          chips[id] = null
          return false
        }

        // create chip from build
        chip = chips[id] = createchip(id, result)

        // load chip firmware
        loadfirmware(chip)
      }

      return !!chip?.tick()
    },
    message(incoming) {
      const { target, path } = parsetarget(incoming.target)
      const targetchip: CHIP | null | undefined = chips[target]
      if (ispresent(targetchip)) {
        targetchip.message({ ...incoming, target: path })
      }
    },
  }

  return os
}
