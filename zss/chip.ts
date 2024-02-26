import ErrorStackParser from 'error-stack-parser'
import { klona } from 'klona/json'

import { FIRMWARE, FIRMWARE_COMMAND } from './firmware'
import { ARG_TYPE, chipreadcontext, readargs } from './firmware/wordtypes'
import { hub } from './hub'
import { GeneratorBuild } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import { isequal, isnumber, isstring } from './mapping/types'

export const HALT_AT_COUNT = 64

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

  // set firmware on chip
  install: (firmware: FIRMWARE) => void

  // state api
  set: (name: string, value: any) => any
  get: (name: string) => any

  // lifecycle api
  cycle: (incoming: number) => void
  tick: () => boolean
  shouldtick: () => boolean
  shouldhalt: () => boolean
  hasmessage: () => number
  yield: () => void
  shouldyield: () => boolean
  send: (target: string, data?: any) => void
  lock: (allowed: string) => void
  unlock: () => void
  message: (incoming: MESSAGE) => void
  zap: (label: string) => void
  restore: (label: string) => void
  getcase: () => number
  endofprogram: () => void
  stacktrace: (error: Error) => void

  // output / config
  text: (...words: WORD[]) => WORD_VALUE
  stat: (...words: WORD[]) => WORD_VALUE
  hyperlink: (...words: WORD[]) => WORD_VALUE

  // logic api
  command: (...words: WORD[]) => WORD_VALUE
  if: (...words: WORD[]) => WORD_VALUE
  try: (...words: WORD[]) => WORD_VALUE
  take: (...words: WORD[]) => WORD_VALUE
  give: (...words: WORD[]) => WORD_VALUE
  repeatStart: (index: number, ...words: WORD[]) => void
  repeat: (index: number) => boolean
  readStart: (index: number, name: WORD) => void
  read: (index: number, ...words: WORD[]) => boolean
  or: (...words: WORD[]) => WORD_VALUE
  and: (...words: WORD[]) => WORD_VALUE
  not: (...words: WORD[]) => WORD_VALUE
  group: (...words: WORD[]) => WORD[]
  isEq: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  isNotEq: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  isLessThan: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  isGreaterThan: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  isLessThanOrEq: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  isGreaterThanOrEq: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opPlus: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opMinus: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opPower: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opMultiply: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opDivide: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opModDivide: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opFloorDivide: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opUniPlus: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
  opUniMinus: (lhs: WORD[], rhs: WORD[]) => WORD_VALUE
}

export type WORD = string | number
export type WORD_VALUE = WORD | WORD[] | undefined

function maptoresult(value: WORD_VALUE): WORD {
  if (Array.isArray(value)) {
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
  const labels = klona(build.labels ?? {})

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

  // tracking for reads
  const reads: Record<number, WORD_VALUE> = {}

  // pause until next tick
  let yieldstate = false

  // execution frequency
  let cycle = 3
  let pulse = 0

  // chip is in ended state awaiting any messages
  let endedstate = false

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

  function invokecommand(name: string, words: WORD[]): 0 | 1 {
    const command = getcommand(name)
    if (!command) {
      throw new Error(`unknown firmware command ${name}`)
    }
    return command(chip, words)
  }

  const chip: CHIP = {
    // id
    id() {
      return id
    },

    // invokes api
    install(firmware) {
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
    cycle(incoming) {
      cycle = incoming
    },
    tick() {
      // chip is yield / ended state
      if (!chip.shouldtick()) {
        return false
      }

      // inc pulse after checking cycle
      const activecycle = pulse % cycle === 0
      ++pulse

      // execution frequency
      if (!activecycle) {
        return false
      }

      // reset state
      loops = 0
      yieldstate = false

      // invoke generator
      try {
        const result = logic?.next()
        if (result?.done) {
          console.error('we crashed?', build.source)
          endedstate = true
        }
      } catch (err: any) {
        console.error('we crashed?', err)
        endedstate = true
      }

      return true
    },
    shouldtick() {
      return endedstate === false || chip.hasmessage() !== 0
    },
    shouldhalt() {
      return loops++ > HALT_AT_COUNT
    },
    hasmessage() {
      const target = message?.target ?? ''
      return labels[target]?.find((item) => item > 0) ?? 0
    },
    yield() {
      yieldstate = true
    },
    shouldyield() {
      return yieldstate || chip.shouldhalt()
    },
    send(target, data) {
      const fulltarget = `vm:${id}:${target}`
      hub.emit(fulltarget, id, data)
      // console.info('send', fulltarget, id, data)
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
      if (message) {
        const label = chip.hasmessage()

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

        // return entry point
        return label
      }
      return 0
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
    command(...words) {
      // 0 - continue
      // 1 - retrys
      if (words.length === 0) {
        // bail on empty commands
        return 0
      }

      const [name, ...args] = words
      const command = getcommand(maptostring(name))
      if (command) {
        return command(chip, args)
      }

      // unknown command defaults to send
      return invokecommand('send', [name, ...args])
    },
    if(...words) {
      const read = chipreadcontext(chip, words)
      const [value, ii] = readargs(read, 0, [ARG_TYPE.ANY])
      const result = maptoresult(value)

      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result
    },
    take(...words) {
      const read = chipreadcontext(chip, words)
      const [name, maybevalue, ii] = readargs(read, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_NUMBER,
      ])

      const current = chip.get(name)
      // default to #TAKE <name> 1
      const value = maybevalue ?? 1

      // taking from an unset flag, or non-numerical value
      if (!isnumber(current)) {
        // todo: raise warning ?
        return 1
      }

      const newvalue = current - value

      // returns true when take fails
      if (newvalue < 0) {
        if (ii < words.length) {
          chip.command(...words.slice(ii))
        }
        return 1
      }

      // update flag
      chip.set(name, newvalue)
      return 0
    },
    give(...words) {
      const read = chipreadcontext(chip, words)
      const [name, maybevalue, ii] = readargs(read, 0, [
        ARG_TYPE.STRING,
        ARG_TYPE.MAYBE_NUMBER,
      ])

      const maybecurrent = chip.get(name)
      const current = isnumber(maybecurrent) ? maybecurrent : 0
      const value = maybevalue ?? 1

      // giving a non-numerical value
      if (!isnumber(value)) {
        // todo: raise warning ?
        return 0
      }

      // returns true when setting an unset flag
      const result = maybecurrent === undefined ? 1 : 0
      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      // update flag
      chip.set(name, current + value)
      return result
    },
    try(...words) {
      const read = chipreadcontext(chip, words)
      const [value, ii] = readargs(read, 0, [ARG_TYPE.ANY])

      // we use go because it tries to move and returns 1 on failure
      const result = invokecommand('go', [value as WORD]) ? 1 : 0
      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result
    },
    repeatStart(index, ...words) {
      const read = chipreadcontext(chip, words)
      const [value, ii] = readargs(read, 0, [ARG_TYPE.NUMBER])

      repeats[index] = value
      repeatscommand[index] = ii < words.length ? words.slice(ii) : undefined
    },
    repeat(index) {
      const count = repeats[index] ?? 0
      repeats[index] = count - 1

      const result = count > 0
      const repeatCmd = repeatscommand[index]

      if (result && repeatCmd) {
        chip.command(...repeatCmd)
      }

      return result
    },
    readStart(index, name) {
      if (!isstring(name)) {
        // todo throw error
        return
      }

      // expects name to be a string
      const arraysource: any[] = chip.get(name) ?? []
      // and chip.get(name) to return an object or an array
      reads[index] = Array.isArray(arraysource) ? arraysource : [arraysource]
    },
    read(index, ...words) {
      const arraysource = reads[index]

      // todo raise error
      if (Array.isArray(arraysource) === false) {
        return false
      }

      // read next value
      const next = arraysource.shift()
      if (next === undefined) {
        return false
      }

      // map values from object or map number. string to counter
      const names = words.map(maptostring)

      console.info('reading', index, names, next)

      switch (typeof next) {
        case 'number':
        case 'string':
          names.forEach((key) => {
            chip.set(key, next)
          })
          break
        case 'object':
          names.forEach((key) => {
            const value = next[key]
            // todo validate type on value
            chip.set(key, value)
          })
          break
        default:
          // todo raise about not being able to read value
          break
      }

      return true
    },
    or(...words) {
      const read = chipreadcontext(chip, words)
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(read, 0, [ARG_TYPE.ANY])
        lastvalue = value
        if (lastvalue) {
          break // or returns the first truthy value
        }
        i = next
      }
      return lastvalue
    },
    and(...words) {
      const read = chipreadcontext(chip, words)
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(read, 0, [ARG_TYPE.ANY])
        lastvalue = value
        if (!lastvalue) {
          break // and returns the first falsy value, or the last value
        }
        i = next
      }
      return lastvalue
    },
    not(...words) {
      const read = chipreadcontext(chip, words)
      const [value] = readargs(read, 0, [ARG_TYPE.ANY])
      return value ? 0 : 1
    },
    group(...words) {
      // eval a group of words as an expression
      const read = chipreadcontext(chip, words)
      const [value] = readargs(read, 0, [ARG_TYPE.ANY])
      return value
    },
    isEq(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.ANY])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.ANY])
      return isequal(left, right) ? 1 : 0
    },
    isNotEq(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.ANY])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.ANY])
      return left !== right ? 1 : 0
    },
    isLessThan(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left < right ? 1 : 0
    },
    isGreaterThan(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left > right ? 1 : 0
    },
    isLessThanOrEq(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left <= right ? 1 : 0
    },
    isGreaterThanOrEq(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left >= right ? 1 : 0
    },
    opPlus(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.ANY])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.ANY])
      return left + right
    },
    opMinus(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.ANY])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.ANY])
      return left - right
    },
    opPower(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return Math.pow(left, right)
    },
    opMultiply(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left * right
    },
    opDivide(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left / right
    },
    opModDivide(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return left % right
    },
    opFloorDivide(lhs, rhs) {
      const [left] = readargs(chipreadcontext(chip, lhs), 0, [ARG_TYPE.NUMBER])
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return Math.floor(left / right)
    },
    opUniPlus(rhs) {
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return +right
    },
    opUniMinus(rhs) {
      const [right] = readargs(chipreadcontext(chip, rhs), 0, [ARG_TYPE.NUMBER])
      return -right
    },
  }

  // create generator instance for chip
  logic = build.code?.(chip)

  return chip
}
