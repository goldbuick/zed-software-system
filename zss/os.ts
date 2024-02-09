import { isDefined } from 'ts-extras'

import { CHIP, createchip } from './chip'
import { MESSAGE_FUNC, parsetarget } from './device'
import { loadfirmware } from './firmware/loader'
import { GeneratorBuild, compile } from './lang/generator'
import { createguid } from './mapping/guid'

export type OS = {
  boot: (id: string | undefined, code: string) => string
  ids: () => string[]
  has: (id: string) => boolean
  halt: (id: string) => boolean
  tick: (id: string) => boolean
  message: MESSAGE_FUNC
}

export function createos() {
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
    boot(maybeid, code) {
      const id = maybeid ?? createguid()

      const result = build(code)
      if (result.errors?.length) {
        // log it ???
        console.error(result)
        return ''
      }

      // create chip from build
      const chip = (chips[id] = createchip(id, result))

      // load chip firmware
      loadfirmware(chip)

      return id
    },
    ids() {
      return Object.keys(chips)
    },
    has(id) {
      return isDefined(chips[id])
    },
    halt(id) {
      const chip = chips[id]
      if (chip) {
        delete chips[id]
      }
      return !!chip
    },
    tick(id) {
      return chips[id]?.tick()
    },
    message(incoming) {
      const { target, path } = parsetarget(incoming.target)

      // check id / name
      os.ids().forEach((id) => {
        if (target === id) {
          chips[id].message({ ...incoming, target: path })
        }
      })
    },
  }

  return os
}
