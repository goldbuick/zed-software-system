import ErrorStackParser from 'error-stack-parser'

import { FIRMWARE, FIRMWARE_COMMAND } from './firmware'
import { ARG_TYPE, readargs } from './firmware/wordtypes'
import { hub } from './hub'
import { GeneratorBuild } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import { CYCLE_DEFAULT } from './mapping/tick'
import {
  MAYBE,
  deepcopy,
  isarray,
  isequal,
  ispresent,
  isstring,
} from './mapping/types'
import { memoryreadcontext } from './memory'

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
  senderid: (maybeid?: string) => string

  // set firmware on chip
  install: (firmware: MAYBE<FIRMWARE>) => void

  // state api
  set: (name: string, value: any) => any
  get: (name: string) => any

  // lifecycle api
  cycle: (incoming: number) => void
  timestamp: () => number
  tick: (incoming: number) => boolean
  shouldtick: () => boolean
  shouldhalt: () => boolean
  hm: () => number
  yield: () => void
  sy: () => boolean
  emit: (target: string, data?: any) => void
  send: (chipid: string, message: string, data?: any) => void
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
  move: (wait: boolean, ...words: WORD[]) => WORD_VALUE
  command: (...words: WORD[]) => WORD_VALUE
  if: (...words: WORD[]) => WORD_VALUE
  repeatstart: (index: number, ...words: WORD[]) => void
  repeat: (index: number) => boolean
  readstart: (index: number, name: WORD) => void
  read: (index: number, ...words: WORD[]) => boolean
  or: (...words: WORD[]) => WORD_VALUE
  and: (...words: WORD[]) => WORD_VALUE
  not: (...words: WORD[]) => WORD_VALUE
  expr: (...words: WORD[]) => WORD[]
  isEq: (lhs: WORD, rhs: WORD) => WORD_VALUE
  isNotEq: (lhs: WORD, rhs: WORD) => WORD_VALUE
  isLessThan: (lhs: WORD, rhs: WORD) => WORD_VALUE
  isGreaterThan: (lhs: WORD, rhs: WORD) => WORD_VALUE
  isLessThanOrEq: (lhs: WORD, rhs: WORD) => WORD_VALUE
  isGreaterThanOrEq: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opPlus: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opMinus: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opPower: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opMultiply: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opDivide: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opModDivide: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opFloorDivide: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opUniPlus: (lhs: WORD, rhs: WORD) => WORD_VALUE
  opUniMinus: (lhs: WORD, rhs: WORD) => WORD_VALUE
}

export type WORD = string | number
export type WORD_VALUE = WORD | WORD[] | undefined

function maptoresult(value: WORD_VALUE): WORD {
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

  // tracking for reads
  const reads: Record<number, WORD_VALUE> = {}

  // pause until next tick
  let yieldstate = false

  // execution frequency
  let cycle = CYCLE_DEFAULT
  let pulse = 0
  // execution timestamp
  let timestamp = 0

  // chip is in ended state awaiting any messages
  let endedstate = ispresent(build.errors)

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
    senderid(maybeid = chip.id()) {
      return `vm${maybeid ?? chip.id()}`
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
    cycle(incoming) {
      cycle = incoming
    },
    timestamp() {
      return timestamp
    },
    tick(incoming) {
      // update timestamp
      timestamp = incoming

      // invoke firmware shouldtick
      for (let i = 0; i < firmwares.length; ++i) {
        firmwares[i].shouldtick(chip)
      }

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

      // invoke firmware tick
      for (let i = 0; i < firmwares.length; ++i) {
        firmwares[i].tick(chip)
      }

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

      // invoke firmware tock
      for (let i = 0; i < firmwares.length; ++i) {
        firmwares[i].tock(chip)
      }

      return true
    },
    shouldtick() {
      return endedstate === false || chip.hm() !== 0
    },
    shouldhalt() {
      return loops++ > HALT_AT_COUNT
    },
    hm() {
      const target = message?.target ?? ''
      return labels[target]?.find((item) => item > 0) ?? 0
    },
    yield() {
      yieldstate = true
    },
    sy() {
      return yieldstate || chip.shouldhalt()
    },
    emit(target, data) {
      hub.emit(target, chip.senderid(), data)
    },
    send(chipid, message, data) {
      hub.emit(`${chip.senderid(chipid)}:${message}`, id, data)
    },
    lock(allowed) {
      locked = allowed
    },
    unlock() {
      locked = ''
    },
    message(incoming) {
      // system messages
      switch (incoming.target) {
        case 'urlstate': {
          const [name, value] = incoming.data
          chip.set(name, value)
          break
        }
        default:
          // internal messages while locked are allowed
          if (locked && incoming.sender !== locked) {
            return
          }
          message = incoming
          break
      }
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
        const label = chip.hm()

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
    move(wait, ...words) {
      // try and move
      const result = chip.command('go', ...words)
      // and yield regardless of the outcome
      chip.yield()
      // if blocked and should wait, return 1
      // otherwise 0
      return result && wait ? 1 : 0
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
      const [value, ii] = readargs(memoryreadcontext(chip, words), 0, [
        ARG_TYPE.ANY,
      ])
      const result = maptoresult(value)
      console.info('if', words, result)

      if (result && ii < words.length) {
        chip.command(...words.slice(ii))
      }

      return result
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

      return result
    },
    readstart(index, name) {
      if (!isstring(name)) {
        // todo throw error
        return
      }

      // expects name to be a string
      const arraysource: any[] = chip.get(name) ?? []
      // and chip.get(name) to return an object or an array
      reads[index] = isarray(arraysource) ? arraysource : [arraysource]
    },
    read(index, ...words) {
      const arraysource = reads[index]

      // todo raise error
      if (isarray(arraysource) === false) {
        return false
      }

      // read next value
      const next = arraysource.shift()
      if (next === undefined) {
        return false
      }

      // map values from object or map number. string to counter
      const names = words.map(maptostring)

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
      let lastvalue = 0
      for (let i = 0; i < words.length; ) {
        const [value, next] = readargs(memoryreadcontext(chip, words), 0, [
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
        const [value, next] = readargs(memoryreadcontext(chip, words), 0, [
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
      return isequal(left, right) ? 1 : 0
    },
    isNotEq(lhs, rhs) {
      const [left] = readargs(memoryreadcontext(chip, [lhs]), 0, [ARG_TYPE.ANY])
      const [right] = readargs(memoryreadcontext(chip, [rhs]), 0, [
        ARG_TYPE.ANY,
      ])
      return left !== right ? 1 : 0
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
  }

  // create generator instance for chip
  logic = build.code?.(chip)

  return chip
}
