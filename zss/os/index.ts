import { CHIP, createChip } from '../lang/chip'
import { FIRMWARE } from '../lang/firmware'
import { GeneratorBuild, compile } from '../lang/generator'
import { createGuid } from '../mapping/guid'

export type OS = {
  boot: (code: string, ...firmwares: FIRMWARE[]) => string
  halt: (id: string) => boolean
  active: (id: string) => boolean
  tick: (id: string) => void
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
    boot(code, ...firmwares) {
      const id = createGuid()

      const result = build(code)
      if (result.errors?.length) {
        // log it ???
        return ''
      }

      const chip = (chips[id] = createChip(result))
      firmwares.forEach((firmware) => firmware.install(chip))

      return id
    },
    halt(id) {
      const chip = chips[id]
      delete chips[id]
      return !!chip
    },
    active(id) {
      const chip = chips[id]
      return chip?.shouldtick() ?? false
    },
    tick(id) {
      const chip = chips[id]
      chip?.tick()
    },
    state(id, name) {
      const chip = chips[id]
      return chip.state(name)
    },
  }

  return os
}
