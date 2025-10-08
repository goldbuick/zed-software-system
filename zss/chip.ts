import ErrorStackParser from 'error-stack-parser'

import { RUNTIME } from './config'
import { MESSAGE, api_error } from './device/api'
import { SOFTWARE } from './device/session'
import {
  DRIVER_TYPE,
  firmwareaftertick,
  firmwareeverytick,
  firmwareget,
  firmwaregetcommand,
  firmwareset,
} from './firmware/runner'
import { GeneratorBuild, GeneratorFunc } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import {
  MAYBE,
  deepcopy,
  isarray,
  isequal,
  isnumber,
  ispresent,
} from './mapping/types'
import { maptonumber, maptostring } from './mapping/value'
import { memoryclearflags, memoryreadflags } from './memory'
import { ARG_TYPE, READ_CONTEXT, readargs } from './words/reader'
import { MaybeFlag, tokenize } from './words/textformat'
import { NAME, WORD, WORD_RESULT } from './words/types'

// may need to expand on this to encapsulate more complex values
export type CHIP = {
  halt: () => void
  // id
  id: () => string

  // state api
  set: (name: string, value: any) => any
  get: (name: string) => any

  // lifecycle api
  tick: (cycle: number) => boolean
  isended: () => boolean
  isfirstpulse: () => boolean
  shouldtick: () => boolean
  shouldhalt: () => boolean
  haslabel: (label: string) => boolean
  hm: () => number
  yield: () => void
  jump: (line: number) => void
  sy: () => boolean
  send: (player: string, chipid: string, message: string, data?: any) => void
  lock: (allowed: string) => void
  unlock: () => void
  message: (incoming: MESSAGE) => void
  zap: (label: string) => void
  restore: (label: string) => void
  getcase: () => number
  nextcase: () => void
  endofprogram: () => void
  stacktrace: (error: Error) => void

  // output / config
  text: (...words: WORD[]) => void
  stat: (...words: WORD[]) => void
  hyperlink: (...words: WORD[]) => void
  template: (words: WORD[]) => string

  // logic api
  command: (...words: WORD[]) => WORD_RESULT
  if: (...words: WORD[]) => WORD_RESULT
  try: (...words: WORD[]) => WORD_RESULT
  take: (...words: WORD[]) => WORD_RESULT
  give: (...words: WORD[]) => WORD_RESULT
  duplicate: (...words: WORD[]) => WORD_RESULT
  repeatstart: (index: number, ...words: WORD[]) => void
  repeat: (index: number) => WORD_RESULT
  foreachstart: (index: number, ...words: WORD[]) => WORD_RESULT
  foreach: (index: number, ...words: WORD[]) => WORD_RESULT
  waitfor: (...words: WORD[]) => WORD_RESULT
  or: (...words: WORD[]) => WORD
  and: (...words: WORD[]) => WORD
  not: (...words: WORD[]) => WORD
  expr: (value: WORD) => WORD
  isEq: (lhs: WORD, rhs: WORD) => WORD
  isNotEq: (lhs: WORD, rhs: WORD) => WORD
  isLessThan: (lhs: WORD, rhs: WORD) => WORD
  isGreaterThan: (lhs: WORD, rhs: WORD) => WORD
  isLessThanOrEq: (lhs: WORD, rhs: WORD) => WORD
  isGreaterThanOrEq: (lhs: WORD, rhs: WORD) => WORD
  opPlus: (lhs: WORD, rhs: WORD) => WORD
  opMinus: (lhs: WORD, rhs: WORD) => WORD
  opPower: (lhs: WORD, rhs: WORD) => WORD
  opMultiply: (lhs: WORD, rhs: WORD) => WORD
  opDivide: (lhs: WORD, rhs: WORD) => WORD
  opModDivide: (lhs: WORD, rhs: WORD) => WORD
  opFloorDivide: (lhs: WORD, rhs: WORD) => WORD
  opUniPlus: (lhs: WORD, rhs: WORD) => WORD
  opUniMinus: (lhs: WORD, rhs: WORD) => WORD
}

function maptoresult(value: WORD): WORD {
  if (isarray(value)) {
    return value.length > 0 ? 1 : 0
  }
  return value ?? 0
}

export function createchipid(id: string) {
  return `${id}_chip`
}

export function senderid(maybeid = '') {
  return `vm:${maybeid ?? ''}`
}

// lifecycle and control flow api
export function createchip(
  id: string,
  driver: DRIVER_TYPE,
  build: GeneratorBuild,
) {
  // chip memory
  const mem = createchipid(id)
  const flags = memoryreadflags(mem)

  // ref to generator instance
  // eslint-disable-next-line prefer-const
  let logic: MAYBE<GeneratorFunc>

  // create labels
  const labels = deepcopy(Object.entries(build.labels ?? {}))

  // init
  if (!isarray(flags.lb) || flags.lb.length !== labels.length) {
    // entry point state
    flags.lb = labels
    // incoming message state
    flags.lk = ''
    // we leave message unset
    flags.mg = undefined
    // we track where we are in execution
    flags.ec = 1
    // prevent infinite loop lockup
    flags.lc = 0
    // pause until next tick
    flags.ys = 0
    // execution frequency
    flags.ps = 0
    // chip is in ended state awaiting any messages
    flags.es = (build.errors?.length ?? 0) !== 0 ? 1 : 0
  }

  function invokecommand(command: string, args: WORD[]): 0 | 1 {
    READ_CONTEXT.words = args
    const commandinvoke = firmwaregetcommand(driver, command)
    if (!ispresent(commandinvoke)) {
      if (command !== 'send') {
        return invokecommand('shortsend', [command, ...args])
      }
      return 0
    }
    return commandinvoke(chip, args)
  }

  const chip: CHIP = {
    halt() {
      memoryclearflags(mem)
    },
    // id
    id() {
      return id
    },
    // internal state api
    set(name, value) {
      const [result, resultvalue] = firmwareset(driver, chip, name, value)
      if (result) {
        return resultvalue
      }
      // no result, return undefined
      return undefined
    },
    get(name) {
      const [result, resultvalue] = firmwareget(driver, chip, name)
      if (result) {
        return resultvalue
      }
      // no result, return undefined
      return undefined
    },

    // lifecycle api
    tick(cycle) {
      // update execution frequency
      const pulse = isnumber(flags.ps) ? flags.ps : 0
      const activecycle = pulse % cycle === 0
      flags.ps = pulse + 1

      // execution frequency
      if (activecycle === false) {
        return false
      }

      // run regardless of tick
      firmwareeverytick(driver, chip)

      // chip is yield / ended state
      const shouldtick = chip.shouldtick()
      if (shouldtick) {
        // reset state
        flags.lc = 0
        flags.ys = 0

        // setup read context get
        READ_CONTEXT.get = chip.get

        // invoke generator
        try {
          if (!logic?.(chip)) {
            flags.es = 1
          }
        } catch (err: any) {
          api_error(SOFTWARE, READ_CONTEXT.elementfocus, 'crash', err.message)
          flags.es = 1
        }
      }

      // cleanup
      firmwareaftertick(driver, chip)
      return shouldtick
    },
    isended() {
      return flags.es === 1
    },
    isfirstpulse() {
      return flags.ps === 1
    },
    shouldtick() {
      return flags.es === 0 || chip.hm() !== 0
    },
    shouldhalt() {
      if (isnumber(flags.lc)) {
        return ++flags.lc > RUNTIME.HALT_AT_COUNT
      }
      return true
    },
    haslabel(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const [name, labels] = flags.lb[i] as [string, number[]]
          if (name === label) {
            // pick first unzapped label to determine active
            const active =
              labels.find((item) => isnumber(item) && item > 0) ?? 0
            return active > 0
          }
        }
      }
      return false
    },
    hm() {
      if (isarray(flags.mg) && isarray(flags.lb)) {
        const [target] = flags.mg as [string] // unpack message
        if (ispresent(target)) {
          for (let i = 0; i < flags.lb.length; ++i) {
            const [name, labels] = flags.lb[i] as [string, number[]]
            if (name === target) {
              // pick first unzapped label
              return labels.find((item) => isnumber(item) && item > 0) ?? 0
            }
          }
        }
      }
      return 0
    },
    yield() {
      flags.ys = 1
    },
    jump(line) {
      flags.ec = line
    },
    sy() {
      return !!flags.ys || chip.shouldhalt()
    },
    send(player, chipid, message, data) {
      SOFTWARE.emit(player, `${senderid(chipid)}:${message}`, data)
    },
    lock(allowed) {
      flags.lk = allowed
    },
    unlock() {
      flags.lk = ''
    },
    message(incoming) {
      // internal messages while locked are allowed
      if (flags.lk && incoming.sender !== flags.lk) {
        return
      }
      // validate we have given label
      if (chip.haslabel(incoming.target)) {
        flags.mg = [
          incoming.target,
          incoming.data,
          incoming.sender,
          incoming.player,
        ]
      } else {
        // should we raise an error ?
      }
    },
    zap(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const entry = flags.lb[i] as [string, number[]]
          if (entry[0] === label) {
            // zap first active label
            const index = entry[1].findIndex((item) => item > 0)
            if (index >= 0 && ispresent(entry[1])) {
              entry[1][index] *= -1
              break
            }
          }
        }
        // console.info('zap', deepcopy(flags.lb))
      }
    },
    restore(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const entry = flags.lb[i] as [string, number[]]
          if (entry[0] === label) {
            // restore all labels
            for (let l = 0; l < entry[1].length; l++) {
              entry[1][l] = Math.abs(entry[1][l])
            }
          }
        }
        // console.info('restore', deepcopy(flags.lb))
      }
    },
    getcase() {
      // ensure execution cursor
      flags.ec = isnumber(flags.ec) ? flags.ec : 1

      // check for pending messages
      const line = chip.hm()
      if (line && isarray(flags.mg)) {
        // incoming.target,
        // incoming.data,
        // incoming.sender,
        // incoming.player,
        const [, arg, sender, player] = flags.mg as [
          string,
          any,
          string,
          string,
        ]

        // update chip state based on incoming message
        chip.set('senderid', sender)
        if (ispresent(arg)) {
          chip.set('arg', arg)
        }

        // this sets player focus
        if (player) {
          // update player stat
          chip.set('player', player)
          // update read context as well
          READ_CONTEXT.elementfocus = player
        }

        // clear message
        flags.mg = undefined

        // reset ended state
        flags.ys = 0
        flags.es = 0

        // update ec
        flags.ec = line
      }

      // always return flags.ec
      return flags.ec
    },
    nextcase() {
      // get execution cursor state
      const cursor = isnumber(flags.ec) ? flags.ec : 1
      // inc it
      flags.ec = cursor + 1
      // always return flags.ec
      return flags.ec
    },
    endofprogram() {
      chip.yield()
      flags.es = 1
    },
    stacktrace(error) {
      const stack = ErrorStackParser.parse(error)
      const [entry] = stack.filter(
        (item) => item.fileName === GENERATED_FILENAME,
      )
      return {
        line: entry?.lineNumber ?? 0,
        column: entry?.columnNumber ?? 0,
      }
    },

    // logic api
    text(value) {
      return invokecommand('text', [value])
    },
    stat(...words) {
      return invokecommand('stat', words)
    },
    hyperlink(...words) {
      return invokecommand('hyperlink', words)
    },
    template(words) {
      const result = tokenize(words.join(' '), true)
      return result.tokens
        .map((token) => {
          if (token.tokenType === MaybeFlag) {
            const maybevalue = chip.get(token.image.substring(1))
            if (ispresent(maybevalue)) {
              return maybevalue
            }
          }
          return token.image
        })
        .join(' ')
    },
    command(...words) {
      // 0 - continue
      // 1 - retrys
      if (words.length === 0) {
        // bail on empty commands
        return 0
      }
      // invoke
      const [name, ...args] = words
      return invokecommand(NAME(maptostring(name)), args)
    },
    if(...words) {
      const [value, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)

      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result ? 1 : 0
    },
    try(...words) {
      const [, ii] = readargs(words, 0, [ARG_TYPE.DIR])

      // try and move
      const result = chip.command('go', ...words)
      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result ? 1 : 0
    },
    take(...words) {
      const [name, maybedec, ii] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.ANY,
      ])

      // given custom dec amount
      const hasdec = isnumber(maybedec)

      // fail branch logic
      const iii = hasdec ? ii : 1

      // default to #TAKE <name> 1
      const current = chip.get(name)
      const value = hasdec ? maybedec : 1

      // taking from an unset flag, or non-numerical value
      if (!isnumber(current)) {
        if (iii < words.length) {
          chip.command(...words.slice(iii))
        }
        return 1
      }

      // returns true when take fails
      const newvalue = current - value
      if (newvalue < 0) {
        if (iii < words.length) {
          chip.command(...words.slice(iii))
        }
        return 1
      }

      // update flag
      chip.set(name, newvalue)
      return 0
    },
    give(...words) {
      const [name, maybeinc, ii] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.ANY,
      ])

      // given custom inc amount
      const hasinc = isnumber(maybeinc)

      // fail branch logic
      const iii = hasinc ? ii : 1

      // default to #GIVE <name> 1
      const maybecurrent = chip.get(name)
      const value = hasinc ? maybeinc : 1

      // returns true when setting an unset flag
      const result = maybecurrent === undefined ? 1 : 0
      if (result) {
        if (iii < words.length) {
          chip.command(...words.slice(iii))
        }
      }

      // update flag
      chip.set(name, maptonumber(maybecurrent, 0) + value)
      return result
    },
    duplicate(...words) {
      return chip.command('duplicate', ...words)
    },
    repeatstart(index, ...words) {
      const [value, ii] = readargs(words, 0, [ARG_TYPE.NUMBER])
      const repeatcount = `repeatcount${index}`
      const repeatwords = `repeatwords${index}`
      flags[repeatcount] = value
      flags[repeatwords] = ii < words.length ? words.slice(ii) : undefined
    },
    repeat(index) {
      const repeatcount = `repeatcount${index}`
      const repeatwords = `repeatwords${index}`
      if (!isnumber(flags[repeatcount])) {
        return 0
      }

      const count = flags[repeatcount]
      flags[repeatcount] = count - 1

      const result = count > 0
      const repeatcmd = flags[repeatwords]

      if (result && isarray(repeatcmd)) {
        chip.command(...repeatcmd)
      }

      return result ? 1 : 0
    },
    foreachstart(_, ...words) {
      const [name, maybemin, maybemax, maybestep] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.MAYBE_NUMBER,
      ])

      let min = Math.min(maybemin, maybemax)
      let max = Math.max(maybemin, maybemax)

      // step 0 is invalid, force to 1
      const step = (maybestep ?? 0) || 1
      if (step < 0) {
        const t = min
        min = max
        max = t
      }

      // set init state
      chip.set(name, min - step)
      return 0
    },
    foreach(_, ...words) {
      const [name, maybemin, maybemax, maybestep, ii] = readargs(words, 0, [
        ARG_TYPE.NAME,
        ARG_TYPE.NUMBER,
        ARG_TYPE.NUMBER,
        ARG_TYPE.MAYBE_NUMBER,
      ])

      let min = Math.min(maybemin, maybemax)
      let max = Math.max(maybemin, maybemax)

      // step 0 is invalid, force to 1
      const step = (maybestep ?? 0) || 1
      if (step < 0) {
        const t = min
        min = max
        max = t
      }

      // get current value and get an init state
      let value = chip.get(name)
      if (!isnumber(value) || value < min || value > max) {
        // reset on nan or invalid range
        value = min
      } else {
        value += step
      }

      const result = value <= max ? 1 : 0
      if (result) {
        // only set when within the value range A to B
        chip.set(name, value)
        if (ii < words.length) {
          chip.command(...words.slice(ii))
        }
      }

      return result
    },
    waitfor(...words) {
      const [value] = readargs(words, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)

      if (!result) {
        // conditional failed, yield until next tick
        chip.yield()
      }

      return result ? 1 : 0
    },
    or(...words) {
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(words, i, [ARG_TYPE.ANY])
        lastvalue = value
        if (lastvalue) {
          break // or returns the first truthy value
        }
        i = next
      }
      return lastvalue
    },
    and(...words) {
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(words, i, [ARG_TYPE.ANY])
        lastvalue = value
        if (!lastvalue) {
          break // and returns the first falsy value, or the last value
        }
        i = next
      }
      return lastvalue
    },
    not(...words) {
      // invert outcome
      const [value] = readargs(words, 0, [ARG_TYPE.ANY])
      return value ? 0 : 1
    },
    expr(...words) {
      // parse expressions
      const [value] = readargs(words, 0, [ARG_TYPE.ANY])
      return value
    },
    isEq(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.ANY])
      const [right] = readargs([rhs], 0, [ARG_TYPE.ANY])
      if (typeof left === 'object' || typeof right === 'object') {
        return isequal(left, right) ? 1 : 0
      }
      return left === right ? 1 : 0
    },
    isNotEq(lhs, rhs) {
      return this.isEq(lhs, rhs) ? 0 : 1
    },
    isLessThan(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left < right ? 1 : 0
    },
    isGreaterThan(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left > right ? 1 : 0
    },
    isLessThanOrEq(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left <= right ? 1 : 0
    },
    isGreaterThanOrEq(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left >= right ? 1 : 0
    },
    opPlus(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.ANY])
      const [right] = readargs([rhs], 0, [ARG_TYPE.ANY])
      return left + right
    },
    opMinus(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.ANY])
      const [right] = readargs([rhs], 0, [ARG_TYPE.ANY])
      return left - right
    },
    opPower(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return Math.pow(left, right)
    },
    opMultiply(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left * right
    },
    opDivide(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left / right
    },
    opModDivide(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return left % right
    },
    opFloorDivide(lhs, rhs) {
      const [left] = readargs([lhs], 0, [ARG_TYPE.NUMBER])
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return Math.floor(left / right)
    },
    opUniPlus(rhs) {
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return +right
    },
    opUniMinus(rhs) {
      const [right] = readargs([rhs], 0, [ARG_TYPE.NUMBER])
      return -right
    },
  }

  // track built function
  logic = build.code

  return chip
}
