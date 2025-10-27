import { CHIP, createchip } from './chip'
import { MESSAGE_FUNC, parsetarget } from './device'
import { api_error } from './device/api'
import { SOFTWARE } from './device/session'
import { DRIVER_TYPE } from './firmware/runner'
import { GeneratorBuild, compile } from './lang/generator'
import { ispresent, isstring } from './mapping/types'
import { memoryreadoperator } from './memory'

export type OS = {
  ids: () => string[]
  isended: (id: string) => boolean
  scrollunlock: (id: string, player: string) => void
  halt: (id: string) => boolean
  gc: () => void
  arg: (id: string, value: any) => void
  tick: (
    id: string,
    driver: DRIVER_TYPE,
    cycle: number,
    name: string,
    code: string,
  ) => boolean
  once: (id: string, driver: DRIVER_TYPE, name: string, code: string) => boolean
  message: MESSAGE_FUNC
}

export function createos() {
  const builds: Record<string, GeneratorBuild> = {}
  const chips: Record<string, CHIP | undefined> = {}
  function build(name: string, code: string) {
    const cache = builds[code]
    if (cache) {
      return cache
    }
    const result = compile(name, code)
    builds[code] = result
    return result
  }
  const os: OS = {
    ids() {
      return Object.keys(chips)
    },
    isended(id) {
      const chip = chips[id]
      if (ispresent(chip)) {
        return chip.isended()
      }
      return true
    },
    scrollunlock(id, player) {
      const chip = chips[id]
      if (ispresent(chip)) {
        chip.scrollunlock(player)
      }
    },
    halt(id) {
      const chip = chips[id]
      if (ispresent(chip)) {
        chip.halt()
        delete chips[id]
      }
      return !!chip
    },
    gc() {
      const ids = os.ids()
      for (let i = 0; i < ids.length; ++i) {
        if (os.isended(ids[i])) {
          os.halt(ids[i])
        }
      }
    },
    arg(id, value) {
      const chip = chips[id]
      if (ispresent(chip)) {
        chip.set('arg', value)
      }
    },
    tick(id, driver, cycle, name, code) {
      let chip = chips[id]

      // attempt to create chip
      if (!ispresent(chips[id])) {
        const result = build(name, code)
        // create chip from build
        chip = chips[id] = createchip(id, driver, result)

        // bail on errors
        if (result.errors?.length) {
          const [primary] = result.errors
          const errorline = (primary?.line ?? 2) - 1
          const codelines: [string, number][] = code
            .replaceAll('\r\n', '')
            .split('\n')
            .map((line, index) => [line, index])

          // show error context
          const precode = codelines.slice(errorline - 2, errorline)
          for (let i = 0; i < precode.length; ++i) {
            const [line, index] = precode[i]
            api_error(
              SOFTWARE,
              memoryreadoperator(),
              'build',
              `$grey${index + 1} $grey${line}`,
            )
          }

          const [hline, hindex] = codelines[errorline] ?? []
          if (isstring(hline) && ispresent(hindex)) {
            const start = (primary.column ?? 1) - 1
            const end = start + primary.length
            const hlinepadded = start < hline.length ? hline : `${hline}*`
            const a = hlinepadded.substring(0, start)
            const b = hlinepadded.substring(start, end)
            const c = hlinepadded.substring(end)
            api_error(
              SOFTWARE,
              memoryreadoperator(),
              'build',
              `$red${hindex + 1} $grey${a}$red${b}$grey${c}`,
            )
          }

          const postcode = codelines.slice(errorline + 1, errorline + 3)
          for (let i = 0; i < postcode.length; ++i) {
            const [line, index] = postcode[i]
            api_error(
              SOFTWARE,
              memoryreadoperator(),
              'build',
              `$grey${index + 1} $grey${line}`,
            )
          }

          const preamble = primary.message.split('\n').slice(0, 4).join(' ')
          api_error(SOFTWARE, memoryreadoperator(), 'build', preamble)
          return false
        }
      }

      // run it
      return !!chip?.tick(cycle)
    },
    once(id, driver, name, code) {
      const result = os.tick(id, driver, 1, name, code)
      return os.halt(id) && result
    },
    message(incoming) {
      const { target, path } = parsetarget(incoming.target)
      const targetchip: CHIP | null | undefined = chips[target]
      if (ispresent(targetchip)) {
        const message = { ...incoming, target: path }
        targetchip.message(message)
      }
    },
  }
  return os
}
