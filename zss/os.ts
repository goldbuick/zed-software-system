import { BOARD_ELEMENT } from './board'
import { CHIP, createchip } from './chip'
import { MESSAGE_FUNC, parsetarget } from './device'
import { loadfirmware } from './firmware/loader'
import { GeneratorBuild, compile } from './lang/generator'
import { createguid } from './mapping/guid'

export type OS = {
  boot: (opts: { id?: string; code: string; target: BOARD_ELEMENT }) => string
  ids: () => string[]
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
    boot(opts) {
      const id = opts.id ?? createguid()

      const result = build(opts.code)
      if (result.errors?.length) {
        // log it ???
        console.error(result)
        return ''
      }

      // create chip from build and load
      const chip = (chips[id] = createchip(id, result, opts.target))
      loadfirmware(chip)

      return id
    },
    ids() {
      return Object.keys(chips)
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
