import ErrorStackParser from 'error-stack-parser'

import { api_error } from './device/api'
import { FIRMWARE, FIRMWARE_COMMAND } from './firmware'
import { ARG_TYPE, readargs } from './firmware/wordtypes'
import { hub } from './hub'
import { GeneratorBuild } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import {
  MAYBE,
  deepcopy,
  isarray,
  isequal,
  isnumber,
  ispresent,
} from './mapping/types'
import { memoryreadcontext } from './memory'
import { WORD, WORD_RESULT } from './memory/types'

export const CONFIG = { HALT_AT_COUNT: 64 }

export type MESSAGE = {
  id: string
  target: string
  data?: any
  sender: string
  player?: string
}

export type STATE = Record<string, any>

// may need to expand on this to encapsulate more complex values
export type CHIP = {
  // id
  id: () => string
  senderid: (maybeid?: string) => string

  // set firmware on chip
  install: (firmware: MAYBE<FIRMWARE>) => void

  // export chip run state
  // import chip run state
  // should the global tick increment be actual part of the individual book ??
  // the answer is yes!

  // state api
  set: (name: string, value: any) => any
  get: (name: string) => any

  // lifecycle api
  // cycle: (incoming: number) => void
  timestamp: () => number
  tick: (cycle: number, incoming: number) => boolean
  isended: () => boolean
  shouldtick: () => boolean
  shouldhalt: () => boolean
  goto: (label: string) => void
  hm: () => number
  yield: () => void
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
  move: (wait: WORD_RESULT, ...words: WORD[]) => WORD_RESULT
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

  // util api
  debugger: () => WORD
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

// lifecycle and control flow api
export function createchip(id: string, build: GeneratorBuild) {
  // entry point state
  const labels = deepcopy(build.labels ?? {})

  // ref to generator instance
  // eslint-disable-next-line prefer-const
  let logic: Generator<number> | undefined

  // incoming message state
  let locked = ''
  let message: MESSAGE | undefined = undefined

  // prevent infinite loop lockup
  let loops = 0

  // tracking for repeats
  const repeats: Record<number, number> = {}
  const repeatscommand: Record<number, undefined | WORD[]> = {}

  // pause until next tick
  let yieldstate = false

  // execution frequency
  let pulse = 0
  // execution timestamp
  let timestamp = 0

  // chip is in ended state awaiting any messages
  let endedstate = (build.errors?.length ?? 0) !== 0

  // chip invokes
  const firmwares: FIRMWARE[] = []
  let invokes: Record<string, FIRMWARE_COMMAND> = {}

  function getcommand(name: string) {
    if (invokes[name] === undefined) {
      for (let i = 0; i < firmwares.length; ++i) {
        const command = firmwares[i].getcommand(name)
        if (command) {
          invokes[name] = command
        }
      }
    }

    return invokes[name]
  }

  function invokecommand(name: string, words: WORD[]) {
    const command = getcommand(name)
    if (!command) {
      throw new Error(`unknown firmware command ${name}`)
    }
    command(chip, words)
  }

  const chip: CHIP = {
    // id
    id() {
      return id
    },
    senderid(maybeid = chip.id()) {
      return `vm:${maybeid ?? chip.id()}`
    },

    // invokes api
    install(firmware) {
      if (!ispresent(firmware)) {
        return
      }
      // clear invoke cache
      invokes = {}
      // add firmware
      firmwares.push(firmware)
    },

    // internal state api
    set(name, value) {
      const lname = name.toLowerCase()

      for (let i = 0; i < firmwares.length; ++i) {
        const [result] = firmwares[i].set(chip, lname, value)
        if (result) {
          return value
        }
      }

      // raise an error ??
      return value
    },
    get(name) {
      const lname = name.toLowerCase()

      for (let i = 0; i < firmwares.length; ++i) {
        const [result, value] = firmwares[i].get(chip, lname)
        if (result) {
          return value
        }
      }

      // no result, return undefined
      return undefined
    },

    // lifecycle api
    timestamp() {
      return timestamp
    },
    tick(cycle, incoming) {
      // update timestamp
      timestamp = incoming

      // we active ?
      const activecycle = pulse % cycle === 0

      // invoke firmware shouldtick
      for (let i = 0; i < firmwares.length; ++i) {
        firmwares[i].shouldtick(chip, activecycle)
      }

      // chip is yield / ended state
      if (!chip.shouldtick()) {
        return false
      }

      // inc pulse after checking should tick
      ++pulse

      // execution frequency
      if (!activecycle) {
        return false
      }

      // reset state
      loops = 0
      yieldstate = false

      // invoke firmware tick
      for (let i = 0; i < firmwares.length; ++i) {
        firmwares[i].tick(chip)
      }

      // invoke generator
      try {
        const result = logic?.next()

        if (result?.done) {
          api_error('chip', 'crash', 'generator logic unexpectedly exited')
          endedstate = true
        }
      } catch (err: any) {
        api_error('chip', 'crash', err.message)
        endedstate = true
      }

      // invoke firmware tock
      for (let i = 0; i < firmwares.length; ++i) {
        firmwares[i].tock(chip)
      }

      return true
    },
    isended() {
      return endedstate === true
    },
    shouldtick() {
      return endedstate === false || chip.hm() !== 0
    },
    shouldhalt() {
      return loops++ > CONFIG.HALT_AT_COUNT
    },
    goto(label) {
      invokecommand('send', [label])
    },
    hm() {
      const target = message?.target ?? ''
      if (ispresent(message?.target)) {
        return labels[target]?.find((item) => item > 0) ?? 0
      }
      return 0
    },
    yield() {
      yieldstate = true
    },
    sy() {
      return yieldstate || chip.shouldhalt()
    },
    emit(target, data, player) {
      hub.emit(target, chip.senderid(), data, player)
    },
    send(chipid, message, data, player) {
      hub.emit(`${chip.senderid(chipid)}:${message}`, id, data, player)
    },
    lock(allowed) {
      locked = allowed
    },
    unlock() {
      locked = ''
    },
    message(incoming) {
      // internal messages while locked are allowed
      if (locked && incoming.sender !== locked) {
        return
      }
      message = incoming
    },
    zap(label) {
      const labelset = labels[label]
      if (labelset) {
        const index = labelset.findIndex((item) => item > 0)
        if (index >= 0) {
          labelset[index] *= -1
        }
      }
    },
    restore(label) {
      const labelset = labels[label]
      if (labelset) {
        for (let i = 0; i < labelset.length; i++) {
          labelset[i] = Math.abs(labelset[i])
        }
      }
    },
    getcase() {
      const label = chip.hm()
      if (label && ispresent(message)) {
        // update chip state based on incoming message
        chip.set('sender', message.sender)
        chip.set('data', message.data)

        // this sets player focus
        if (message.player) {
          chip.set('player', message.player)
        }

        // clear message
        message = undefined

        // reset ended state
        yieldstate = false
        endedstate = false
      }

      // return entry point
      return label
    },
    endofprogram() {
      chip.yield()
      endedstate = true
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
    move(wait, ...words) {
      // try and move
      const result = chip.command('go', ...words) && wait
      // and yield regardless of the outcome
      chip.yield()
      // if blocked and should wait, return 1
      // otherwise 0
      return result ? 1 : 0
    },
    command(...words) {
      // 0 - continue
      // 1 - retrys
      if (words.length === 0) {
        // bail on empty commands
        return 0
      }

      const [name, ...args] = words
      const command = getcommand(maptostring(name))

      // found command, invoke
      if (ispresent(command)) {
        return command(chip, args)
      }

      // unknown command,  defaults to send
      invokecommand('send', [name, ...args])
      return 0
    },
    if(...words) {
      const [value, ii] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.ANY,
      ])
      const result = maptoresult(value)

      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result ? 1 : 0
    },
    repeatstart(index, ...words) {
      const [value, ii] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.NUMBER,
      ])

      repeats[index] = value
      repeatscommand[index] = ii < words.length ? words.slice(ii) : undefined
    },
    repeat(index) {
      const count = repeats[index] ?? 0
      repeats[index] = count - 1

      const result = count > 0
      const repeatcmd = repeatscommand[index]

      if (result && repeatcmd) {
        chip.command(...repeatcmd)
      }

      return result ? 1 : 0
    },
    foreachstart(...words) {
      const [name, maybemin, maybemax, maybestep] = readargs(
        memoryreadcontext(chip, words),
        0,
        [
          ARG_TYPE.STRING,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ],
      )

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
      const [name, maybemin, maybemax, maybestep, ii] = readargs(
        memoryreadcontext(chip, words),
        0,
        [
          ARG_TYPE.STRING,
          ARG_TYPE.NUMBER,
          ARG_TYPE.NUMBER,
          ARG_TYPE.MAYBE_NUMBER,
        ],
      )

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
        const [value, next] = readargs(memoryreadcontext(chip, words), i, [
          ARG_TYPE.ANY,
        ])
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
        const [value, next] = readargs(memoryreadcontext(chip, words), i, [
          ARG_TYPE.ANY,
        ])
        lastvalue = value
        if (!lastvalue) {
          break // and returns the first falsy value, or the last value
        }
        i = next
      }
      return lastvalue
    },
    not(...words) {
      const [value] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.ANY,
      ])
      return value ? 0 : 1
    },
    expr(...words) {
      // eval a group of words as an expression
      const [value] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.ANY,
      ])
      return value
    },
    isEq(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [ARG_TYPE.ANY])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.ANY,
      ])
      if (typeof left === 'object' || typeof right === 'object') {
        return isequal(left, right) ? 1 : 0
      }
      return left === right ? 1 : 0
    },
    isNotEq(lhs, rhs) {
      return this.isEq(lhs, rhs) ? 0 : 1
    },
    isLessThan(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left < right ? 1 : 0
    },
    isGreaterThan(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left > right ? 1 : 0
    },
    isLessThanOrEq(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left <= right ? 1 : 0
    },
    isGreaterThanOrEq(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left >= right ? 1 : 0
    },
    opPlus(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [ARG_TYPE.ANY])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.ANY,
      ])
      return left + right
    },
    opMinus(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [ARG_TYPE.ANY])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.ANY,
      ])
      return left - right
    },
    opPower(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return Math.pow(left, right)
    },
    opMultiply(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left * right
    },
    opDivide(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left / right
    },
    opModDivide(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return left % right
    },
    opFloorDivide(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return Math.floor(left / right)
    },
    opUniPlus(rhs) {
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return +right
    },
    opUniMinus(rhs) {
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.NUMBER,
      ])
      return -right
    },
    debugger() {
      debugger
      return 0
    },
  }

  // create generator instance for chip
  logic = build.code?.(chip)

  return chip
}
