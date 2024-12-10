import ErrorStackParser from 'error-stack-parser'

import { api_error } from './device/api'
import {
  DRIVER_TYPE,
  firmwareget,
  firmwaregetcommand,
  firmwareset,
  firmwareshouldtick,
  firmwaretick,
  firmwaretock,
} from './firmware/runner'
import { hub } from './hub'
import { GeneratorBuild } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import {
  deepcopy,
  isarray,
  isequal,
  isnumber,
  ispresent,
} from './mapping/types'
import { memoryclearflags, memoryreadflags } from './memory'
import { ARG_TYPE, READ_CONTEXT, readargs } from './words/reader'
import { WORD, WORD_RESULT } from './words/types'

export const CONFIG = { HALT_AT_COUNT: 64 }

export type MESSAGE = {
  id: string
  target: string
  data?: any
  sender: string
  player?: string
}

// may need to expand on this to encapsulate more complex values
export type CHIP = {
  halt: () => void
  // id
  id: () => string
  senderid: (maybeid?: string) => string

  // state api
  set: (name: string, value: any) => any
  get: (name: string) => any

  // lifecycle api
  tick: (cycle: number, incoming: number) => boolean
  isended: () => boolean
  shouldtick: () => boolean
  shouldhalt: () => boolean
  hm: () => number
  yield: () => void
  next: (line: number) => void
  sy: () => boolean
  emit: (target: string, data?: any, player?: string) => void
  send: (chipid: string, message: string, data?: any, player?: string) => void
  lock: (allowed: string) => void
  unlock: () => void
  message: (incoming: MESSAGE) => void
  zap: (label: string) => void
  restore: (label: string) => void
  getcase: () => number
  endofprogram: () => void
  stacktrace: (error: Error) => void

  // output / config
  text: (...words: WORD[]) => void
  stat: (...words: WORD[]) => void
  hyperlink: (...words: WORD[]) => void

  // logic api
  move: (...words: WORD[]) => WORD_RESULT
  command: (...words: WORD[]) => WORD_RESULT
  if: (...words: WORD[]) => WORD_RESULT
  repeatstart: (index: number, ...words: WORD[]) => void
  repeat: (index: number) => WORD_RESULT
  foreachstart: (...words: WORD[]) => WORD_RESULT
  foreach: (...words: WORD[]) => WORD_RESULT
  or: (...words: WORD[]) => WORD
  and: (...words: WORD[]) => WORD
  not: (...words: WORD[]) => WORD
  expr: (...words: WORD[]) => WORD[]
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

export function maptostring(value: any) {
  return `${value ?? ''}`
}

export function createchipid(id: string) {
  return `${id}_chip`
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
  let logic: Generator<number> | undefined

  // init
  if (!ispresent(flags.lb)) {
    // entry point state
    flags.lb = deepcopy(Object.entries(build.labels ?? {}))
    // incoming message state
    flags.lk = ''
    // we leave message unset
    flags.mg = undefined
    // we track where we are in execution
    flags.ec = 0
    // prevent infinite loop lockup
    flags.lc = 0
    // pause until next tick
    flags.ys = 0
    // execution frequency
    flags.ps = 0
    // execution timestamp
    flags.ts = 0
    // chip is in ended state awaiting any messages
    flags.es = (build.errors?.length ?? 0) !== 0 ? 1 : 0
  }

  function invokecommand(command: string, args: WORD[]): 0 | 1 {
    READ_CONTEXT.words = args
    READ_CONTEXT.get = chip.get
    const commandinvoke = firmwaregetcommand(driver, command)
    if (!ispresent(commandinvoke)) {
      if (command !== 'send') {
        return invokecommand('send', [command, ...args])
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
    senderid(maybeid = id) {
      return `vm:${maybeid ?? id}`
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
    tick(cycle, incoming) {
      // update timestamp
      flags.ts = incoming

      // we active ?
      const pulse = isnumber(flags.ps) ? flags.ps : 0
      const activecycle = pulse % cycle === 0

      // invoke firmware shouldtick
      firmwareshouldtick(driver, chip, activecycle)

      // chip is yield / ended state
      if (!chip.shouldtick()) {
        return false
      }

      // inc pulse after checking should tick
      flags.ps = pulse + 1

      // execution frequency
      if (!activecycle) {
        return false
      }

      // reset state
      flags.lc = 0
      flags.ys = 0

      // invoke firmware tick
      firmwaretick(driver, chip)

      // invoke generator
      try {
        const result = logic?.next()
        if (result?.done) {
          api_error('chip', 'crash', 'generator logic unexpectedly exited')
          flags.es = 1
        }
      } catch (err: any) {
        api_error('chip', 'crash', err.message)
        flags.es = 1
      }

      // invoke firmware tock
      firmwaretock(driver, chip)
      return true
    },
    isended() {
      return flags.es === 1
    },
    shouldtick() {
      return flags.es === 0 || chip.hm() !== 0
    },
    shouldhalt() {
      if (isnumber(flags.lc)) {
        return flags.lc++ > CONFIG.HALT_AT_COUNT
      }
      return true
    },
    hm() {
      if (isarray(flags.mg) && isarray(flags.lb)) {
        const [, target] = flags.mg as [string, string] // unpack message
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
    next(line) {
      flags.ec = line
    },
    sy() {
      return !!flags.ys || chip.shouldhalt()
    },
    emit(target, data, player) {
      hub.emit(target, chip.senderid(), data, player)
    },
    send(chipid, message, data, player) {
      hub.emit(`${chip.senderid(chipid)}:${message}`, id, data, player)
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
      flags.mg = [
        incoming.id,
        incoming.target,
        incoming.data,
        incoming.sender,
        incoming.player,
      ]
    },
    zap(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const [name, lines] = flags.lb[i] as [string, number[]]
          if (name === label) {
            // zap first active label
            const index = lines.findIndex((item) => item > 0)
            if (index >= 0) {
              lines[index] *= -1
            }
          }
        }
      }
    },
    restore(label) {
      if (isarray(flags.lb)) {
        for (let i = 0; i < flags.lb.length; ++i) {
          const [name, lines] = flags.lb[i] as [string, number[]]
          if (name === label) {
            for (let l = 0; l < lines.length; l++) {
              lines[i] = Math.abs(lines[i])
            }
          }
        }
      }
    },
    getcase() {
      const line = chip.hm()
      if (ispresent(line) && isarray(flags.mg)) {
        const [, , arg, sender, player] = flags.mg as [
          string,
          string,
          any,
          string,
          string,
        ]

        // update chip state based on incoming message
        chip.set('sender', sender)
        chip.set('arg', arg)

        // this sets player focus
        if (player) {
          chip.set('player', player)
        }

        // clear message
        flags.mg = undefined

        // reset ended state
        flags.ys = 0
        flags.es = 0

        // update ec
        flags.ec = line
      }

      // always return ec
      return isnumber(flags.ec) ? flags.ec : 0
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
    move(...words) {
      // try and move
      const blocked = chip.command('go', ...words)
      // and yield regardless of the outcome
      chip.yield()
      // return if blocked
      return blocked
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
      return invokecommand(maptostring(name), args)
    },
    if(...words) {
      const [value, ii] = readargs(words, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)

      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result ? 1 : 0
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
    foreachstart(...words) {
      const [name, maybemin, maybemax, maybestep] = readargs(words, 0, [
        ARG_TYPE.STRING,
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
    foreach(...words) {
      const [name, maybemin, maybemax, maybestep, ii] = readargs(words, 0, [
        ARG_TYPE.STRING,
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
      // eval a group of words as an expression
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

  // create generator instance for chip
  logic = build.code?.(chip)

  return chip
}
