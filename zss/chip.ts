import ErrorStackParser from 'error-stack-parser'
import { klona } from 'klona/json'

import { BOARD_ELEMENT } from './board'
import { FIRMWARE, FIRMWARE_COMMAND } from './firmware'
import { INPUT } from './gadget/data/types'
import { hub } from './hub'
import { GeneratorBuild } from './lang/generator'
import { GENERATED_FILENAME } from './lang/transformer'
import { isNumber, isString } from './mapping/types'

export const HALT_AT_COUNT = 64

export type MESSAGE = {
  id: string
  target: string
  data?: any
  from: string
  player?: string
}

export type STATE = Record<string, any>

// may need to expand on this to encapsulate more complex values
export type CHIP = {
  // id
  id: () => string
  name: () => string
  player: () => string
  target: () => BOARD_ELEMENT
  setName: (name: string) => void

  // set firmware on chip
  install: (firmware: FIRMWARE) => void

  // state api
  set: (name: string, value: any) => any
  get: (name: string) => any

  // lifecycle api
  tick: () => boolean
  shouldtick: () => boolean
  shouldhalt: () => boolean
  hasmessage: () => number
  yield: () => void
  shouldyield: () => boolean
  send: (target: string, data?: any) => void
  lock: (allowed: string) => void
  unlock: () => void
  input: (incoming: INPUT) => void
  message: (incoming: MESSAGE) => void
  zap: (label: string) => void
  restore: (label: string) => void
  getcase: () => number
  endofprogram: () => void
  stacktrace: (error: Error) => void

  // template / parse api
  tp: (...items: string[]) => string
  tpi: (word: WORD) => WORD_VALUE
  tpn: (word: WORD) => number
  parse: (words: WORD[]) => [WORD_VALUE, WORD[]]
  parsegroup: (...words: WORD[]) => WORD_VALUE

  // logic api
  text: (value: string) => WORD_VALUE
  stat: (...words: WORD[]) => WORD_VALUE
  hyperlink: (...words: WORD[]) => WORD_VALUE
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
  not: (word: WORD) => WORD_VALUE
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
  if (Array.isArray(value)) {
    return value.length > 0 ? 1 : 0
  }
  return value ?? 0
}

export function maptostring(value: any) {
  return `${value ?? ''}`
}

type createchipoptions = {
  id: string
  build: GeneratorBuild
  target: BOARD_ELEMENT
}

// lifecycle and control flow api
export function createchip({ id, build, target }: createchipoptions) {
  // naming
  let chipname = 'object'

  // entry point state
  const labels = klona(build.labels ?? {})

  // ref to generator instance
  // eslint-disable-next-line prefer-const
  let logic: Generator<number> | undefined

  // input queue state
  const inputqueue = new Set<INPUT>()
  let input: INPUT | undefined = undefined

  // incoming message state
  let locked = ''
  let message: MESSAGE | undefined = undefined

  // internals
  target.stats = target.stats ?? {}

  // prevent infinite loop lockup
  let loops = 0

  // tracking for repeats
  const repeats: Record<number, number> = {}
  const repeatscommand: Record<number, undefined | WORD[]> = {}

  // tracking for reads
  const reads: Record<number, WORD_VALUE> = {}

  // pause until next tick
  let yieldstate = false

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

  function invokecommand(name: string, words: WORD[]): WORD_VALUE {
    const command = getcommand(name)
    if (!command) {
      throw new Error(`unknown firmware command ${name}`)
    }
    return command(chip, words)
  }

  function readinput() {
    if (input === undefined) {
      const [head = INPUT.NONE] = inputqueue
      // ensure we have stats
      if (target.stats === undefined) {
        target.stats = {}
      }
      // write input state
      target.stats.inputmove = 0
      target.stats.inputshoot = 0
      target.stats.inputok = 0
      target.stats.inputcancel = 0
      target.stats.inputmenu = 0
      switch (head) {
        case INPUT.MOVE_LEFT:
        case INPUT.MOVE_RIGHT:
        case INPUT.MOVE_UP:
        case INPUT.MOVE_DOWN:
          target.stats.inputmove = head - INPUT.MOVE_LEFT
          break
        case INPUT.SHOOT_LEFT:
        case INPUT.SHOOT_RIGHT:
        case INPUT.SHOOT_UP:
        case INPUT.SHOOT_DOWN:
          target.stats.inputshoot = head - INPUT.SHOOT_LEFT
          break
        case INPUT.OK_BUTTON:
          target.stats.inputok = 1
          break
        case INPUT.CANCEL_BUTTON:
          target.stats.inputcancel = 1
          break
        case INPUT.MENU_BUTTON:
          target.stats.inputmenu = 1
          break
      }
      // active input
      input = head
      inputqueue.delete(head)
    }
  }

  function getinternal(word: string) {
    // read from input queue
    switch (word.toLowerCase()) {
      case 'player':
        return target.stats?.player ?? ''
      case 'sender':
        return target.stats?.sender ?? ''
      case 'data':
        return target.stats?.data ?? 0
      case 'inputmove':
        readinput()
        return target.stats?.inputmove ?? 0
      case 'inputshoot':
        readinput()
        return target.stats?.inputshoot ?? 0
      case 'inputok':
        readinput()
        return target.stats?.inputok ?? 0
      case 'inputcancel':
        readinput()
        return target.stats?.inputcancel ?? 0
      case 'inputmenu':
        readinput()
        return target.stats?.inputmenu ?? 0
      default:
        return chip.get(word)
    }
  }

  const chip: CHIP = {
    // id
    id() {
      return id
    },
    name() {
      return chipname
    },
    player() {
      return getinternal('player')
    },
    target() {
      return target
    },
    setName(incoming) {
      chipname = incoming
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

      // console.info('>>>set', lname, value)
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

      // console.info('>>>get', lname)
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
    tick() {
      // should we bail ?
      if (!chip.shouldtick()) {
        return false
      }

      // reset state
      loops = 0
      yieldstate = false
      input = undefined

      // invoke generator
      try {
        const result = logic?.next()
        if (result?.done) {
          console.error('we crashed?', build.source)
          endedstate = true
        }
      } catch (err: any) {
        console.error(err)
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
    input(incoming) {
      inputqueue.add(incoming)
    },
    message(incoming) {
      // internal messages while locked are allowed
      if (locked && incoming.from !== locked) {
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

        // update chip value state based on incoming message
        if (target.stats) {
          target.stats.sender = message.from
          target.stats.data = message.data

          // this sets player focus
          if (message.player) {
            target.stats.player = message.player
          }
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

    // values api
    tp(...items) {
      return items.join('')
    },
    tpi(word) {
      const result = typeof word === 'string' ? getinternal(word) : word
      return result ?? ''
    },
    tpn(word) {
      const result = typeof word === 'string' ? getinternal(word) : word
      return isNumber(result) ? result : 0
    },

    parse(words) {
      // iterate through firmware to parse words
      for (let i = 0; i < firmwares.length; ++i) {
        const [result, resumeindex, value] =
          firmwares[i].parse?.(chip, words) ?? []
        if (result && resumeindex) {
          return [value, words.slice(resumeindex)]
        }
      }

      // default behavior
      const [first] = words
      // see if we have been given a flag, otherwise treat it as a string
      const value =
        (typeof first === 'string' ? getinternal(first) : undefined) ?? first

      // return parsed value, with remaining words
      return [value, words.slice(1)]
    },
    parsegroup(...words) {
      const [value] = chip.parse(words)
      return value
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
      // 1 - retry

      if (words.length < 1) {
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
      const [value, next] = chip.parse(words)
      const result = maptoresult(value)

      if (result && next.length) {
        chip.command(...next)
      }

      return result
    },
    take(...words) {
      const [name, ...values] = words

      // todo throw error
      if (!isString(name)) {
        return 0
      }

      const current = chip.get(name)
      const [maybevalue, next] = chip.parse(values)
      const value = maybevalue ?? 1

      // taking from an unset flag, or non-numerical value
      if (!isNumber(current) || !isNumber(value)) {
        // todo: raise warning ?
        return 1
      }

      const newvalue = current - value

      // returns true when take fails
      if (newvalue < 0) {
        if (next.length) {
          chip.command(...next)
        }
        return 1
      }

      // update flag
      chip.set(name, newvalue)
      return 0
    },
    give(...words) {
      const [name, ...values] = words

      // todo throw error
      if (!isString(name)) {
        return 0
      }

      const maybecurrent = chip.get(name)
      const current = isNumber(maybecurrent) ? maybecurrent : 0
      const [maybevalue, next] = chip.parse(values)
      const value = maybevalue ?? 1

      // giving a non-numerical value
      if (!isNumber(value)) {
        // todo: raise warning ?
        return 0
      }

      // returns true when setting an unset flag
      const result = maybecurrent === undefined ? 1 : 0
      if (result && next.length) {
        chip.command(...next)
      }

      // update flag
      chip.set(name, current + value)
      return result
    },
    try(...words) {
      const [value, next] = chip.parse(words)

      const result = maptoresult(invokecommand('try', [value as WORD]))
      if (result && next.length) {
        chip.command(...next)
      }

      return result
    },
    repeatStart(index, ...words) {
      const [maybevalue, next] = chip.parse(words)

      repeats[index] = isNumber(maybevalue) ? maybevalue : 0
      repeatscommand[index] = next
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
      if (!isString(name)) {
        // todo throw error
        return
      }

      // expects name to be a string
      const arraysource: any[] = getinternal(name) ?? []
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
      return words.map(chip.tpn).find((value) => value)
    },
    and(...words) {
      const values = words.map(chip.tpn)
      const index = values.findIndex((value) => !value)
      if (index === -1) {
        return values[values.length - 1]
      }
      return values[index]
    },
    not(word) {
      return chip.tpn(word) ? 0 : 1
    },
    isEq(lhs, rhs) {
      return chip.tpn(lhs) === chip.tpn(rhs) ? 1 : 0
    },
    isNotEq(lhs, rhs) {
      return chip.tpn(lhs) !== chip.tpn(rhs) ? 1 : 0
    },
    isLessThan(lhs, rhs) {
      return chip.tpn(lhs) < chip.tpn(rhs) ? 1 : 0
    },
    isGreaterThan(lhs, rhs) {
      return chip.tpn(lhs) > chip.tpn(rhs) ? 1 : 0
    },
    isLessThanOrEq(lhs, rhs) {
      return chip.tpn(lhs) <= chip.tpn(rhs) ? 1 : 0
    },
    isGreaterThanOrEq(lhs, rhs) {
      return chip.tpn(lhs) >= chip.tpn(rhs) ? 1 : 0
    },
    opPlus(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return left + right
    },
    opMinus(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return left - right
    },
    opPower(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return Math.pow(left, right)
    },
    opMultiply(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return left * right
    },
    opDivide(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return left / right
    },
    opModDivide(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return left % right
    },
    opFloorDivide(lhs, rhs) {
      const left = chip.tpn(lhs)
      const right = chip.tpn(rhs)
      if (!isNumber(left)) {
        // todo: raise error
        return 0
      }
      if (!isNumber(right)) {
        // todo: raise error
        return 0
      }
      return Math.floor(left / right)
    },
    opUniPlus(rhs) {
      return +chip.tpn(rhs)
    },
    opUniMinus(rhs) {
      return -chip.tpn(rhs)
    },
  }

  // create generator instance for chip
  logic = build.code?.(chip)

  return chip
}