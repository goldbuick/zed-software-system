import { CHIP, createchip } from './chip'
import { MESSAGE_FUNC, parsetarget } from './device'
import { api_error } from './device/api'
import { loadfirmware } from './firmware/loader'
import { GeneratorBuild, compile } from './lang/generator'
import { ispresent } from './mapping/types'
import { CODE_PAGE_TYPE } from './memory/codepage'

export type OS_INVOKE = (
  id: string,
  type: CODE_PAGE_TYPE,
  timestamp: number,
  code: string,
) => boolean

export type OS = {
  ids: () => string[]
  has: (id: string) => boolean
  halt: (id: string) => boolean
  tick: OS_INVOKE
  once: OS_INVOKE
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
      return ispresent(chips[id])
    },
    halt(id) {
      const chip = chips[id]
      if (chip) {
        delete chips[id]
      }
      return !!chip
    },
    tick(id, type, timestamp, code) {
      let chip = chips[id]
      if (!ispresent(chips[id])) {
        const result = build(code)
        // create chip from build
        chip = chips[id] = createchip(id, result)
        // bail on errors
        if (result.errors?.length) {
          const [primary] = result.errors
          const errorline = (primary?.line ?? 2) - 1
          const codelines = code.replaceAll('\r\n', '').split('\n')
          primary.message.split('\n').forEach((message) => {
            api_error('os', 'build', message, '')
          })
          codelines.forEach((message, index) => {
            if (index === errorline) {
              const start = (primary.column ?? 1) - 1
              const end = start + primary.length ?? 0
              const a = message.substring(0, start)
              const b = message.substring(start, end)
              const c = message.substring(end)
              api_error('os', 'build', `$grey${a}$red${b}$grey${c}`, '')
            } else {
              api_error('os', 'build', `$grey${message}`, '')
            }
          })
          return false
        }
        // load chip firmware
        loadfirmware(chip, type)
      }
      return !!chip?.tick(timestamp)
    },
    once(id, type, timestamp, code) {
      const result = os.tick(id, type, timestamp, code)
      return result && os.halt(id)
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
