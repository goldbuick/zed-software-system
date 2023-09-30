import ErrorStackParser from 'error-stack-parser'
import { klona } from 'klona/json'

import { GeneratorBuild } from './generator'
import { GENERATED_FILENAME } from './transformer'

export const HALT_AT_COUNT = 32

// id or x, y coords
export type MESSAGE_SOURCE = string | { x: number; y: number }

export type MESSAGE = {
  to: string
  from: MESSAGE_SOURCE
  name: string
  value: any
  playerId: string
}

// may need to expand on this to encapsulate more complex values
export type CHIP = ReturnType<typeof createChip>
export type WORD = string | number
export type WORD_VALUE = WORD | MESSAGE_SOURCE | undefined
export type CHIP_COMMAND = (chip: CHIP, words: WORD[]) => WORD_VALUE
export type CHIP_COMMANDS = Record<string, CHIP_COMMAND>

// lifecycle and control flow api
export function createChip(build: GeneratorBuild) {
  // entry point state
  const labels = klona(build.labels ?? {})

  // ref to generator instance
  // eslint-disable-next-line prefer-const
  let logic: Generator<number> | undefined

  // incoming message state
  let message: MESSAGE | undefined = undefined

  // prevent infinite loop lockup
  let loops = 0

  // tracking for repeats
  const repeats: Record<number, number> = {}
  const repeatsCmd: Record<number, undefined | WORD[]> = {}

  // pause until next tick
  let yieldState = false

  // chip values
  const values = {
    player: '',
    sender: '' as MESSAGE_SOURCE,
    data: '' as WORD_VALUE,
  }

  // chip invokes
  let invokes: Record<string, CHIP_COMMAND> = {}

  function invokecommand(name: string, words: WORD[]) {
    const command = invokes[name]
    if (!command) {
      throw new Error(`unknown firmware command ${name}`)
    }
    return command(chip, words)
  }

  const chip = {
    // invokes api
    define(incoming: CHIP_COMMANDS) {
      invokes = incoming
    },

    // lifecycle api
    tick() {
      // reset state
      loops = 0
      yieldState = false
      try {
        const result = logic?.next()
        if (result?.done) {
          console.error('we crashed?')
        }
      } catch (err: any) {
        console.error(err)
      }
    },
    shouldhalt() {
      return loops++ > HALT_AT_COUNT
    },
    hasmessage() {
      const name = message?.name ?? ''
      const result = labels[name]?.find((item) => item > 0) ?? 0
      return result
    },
    yield() {
      yieldState = true
    },
    shouldyield() {
      return yieldState || chip.shouldhalt()
    },
    send(incoming: MESSAGE) {
      message = incoming
    },
    zap(label: string) {
      const labelset = labels[label]
      if (labelset) {
        const index = labelset.findIndex((item) => item > 0)
        if (index >= 0) {
          labelset[index] *= -1
        }
      }
    },
    restore(label: string) {
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
        values.sender = message.from
        values.data = message.value
        // this sets player focus
        if (message.playerId) {
          values.player = message.playerId
        }

        // clear message
        message = undefined

        // return entry point
        return label
      }
      return 0
    },
    endofprogram() {
      // what does this do ?
      chip.yield()
    },
    stacktrace(error: Error) {
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
    eval(word: WORD): WORD_VALUE {
      if (typeof word === 'string') {
        switch (word.toLowerCase()) {
          case 'player':
            return values.player
          case 'sender':
            return values.sender
          case 'data':
            return values.data
          default:
            return invokecommand('get', [word])
        }
      }
      return word
    },
    isNumber(word: any): word is number {
      return typeof word === 'number'
    },
    isString(word: any): word is string {
      return typeof word === 'string'
    },
    isNumberOrString(word: any): word is number | string {
      return chip.isNumber(word) || chip.isString(word)
    },
    evalToNumber(word: any) {
      if (chip.isNumber(word)) {
        return word
      }
      if (chip.isString(word)) {
        const value = chip.eval(word)
        if (chip.isNumber(value)) {
          return value
        }
      }
      return 0
    },

    parseValue(words: WORD[]) {
      const [first] = words
      // todo, leverage firmeware for this
      return {
        value: chip.evalToNumber(first),
        resumeIndex: 1,
      }
    },

    // logic api
    text(value: string) {
      return invokecommand('text', [value])
    },
    stat(...words: WORD[]) {
      return invokecommand('stat', words)
    },
    hyperlink(message: string, label: string) {
      return invokecommand('hyperlink', [message, label])
    },
    command(...words: WORD[]) {
      if (words.length < 1) {
        return 0
      }

      const [name, ...args] = words
      const command = invokes[name]
      return command ? command(chip, args) : invokecommand('send', args)
    },
    if(...words: WORD[]) {
      const check = chip.parseValue(words)
      const result = invokecommand('if', [check.value])
      if (result) {
        chip.command(...words.slice(check.resumeIndex))
      }
      return result
    },
    try(...words: WORD[]) {
      const check = chip.parseValue(words)
      const result = invokecommand('try', [check.value])
      if (result) {
        chip.command(...words.slice(check.resumeIndex))
      }
      return result
    },
    take(...words: WORD[]) {
      const check = chip.parseValue(words)
      const result = invokecommand('take', [check.value])
      if (result) {
        chip.command(...words.slice(check.resumeIndex))
      }
      return result
    },
    give(...words: WORD[]) {
      const check = chip.parseValue(words)
      const result = invokecommand('give', [check.value])
      if (result) {
        chip.command(...words.slice(check.resumeIndex))
      }
      return result
    },
    while(...words: WORD[]) {
      const check = chip.parseValue(words)
      const result = invokecommand('if', [check.value])
      if (result) {
        chip.command(...words.slice(check.resumeIndex))
      }
      return result
    },
    repeatStart(index: number, ...words: WORD[]) {
      const check = chip.parseValue(words)

      repeats[index] = check.value
      repeatsCmd[index] = words.slice(check.resumeIndex)

      return 0
    },
    repeat(index: number) {
      const count = repeats[index] ?? 0
      repeats[index] = count - 1

      const result = count > 0
      const repeatCmd = repeatsCmd[index]
      if (result && repeatCmd) {
        chip.command(...repeatCmd)
      }

      return result
    },
    or(...words: WORD[]) {
      return words.map(chip.evalToNumber).find((value) => value)
    },
    and(...words: WORD[]) {
      const values = words.map(chip.evalToNumber)
      const index = values.findIndex((value) => !value)
      if (index === -1) {
        return values[values.length - 1]
      }
      return values[index]
    },
    not(word: WORD) {
      return chip.evalToNumber(word) ? 0 : 1
    },
    isEq(lhs: WORD, rhs: WORD) {
      return chip.evalToNumber(lhs) === chip.evalToNumber(rhs) ? 1 : 0
    },
    isNotEq(lhs: WORD, rhs: WORD) {
      return chip.evalToNumber(lhs) !== chip.evalToNumber(rhs) ? 1 : 0
    },
    isLessThan(lhs: WORD, rhs: WORD) {
      return chip.evalToNumber(lhs) < chip.evalToNumber(rhs) ? 1 : 0
    },
    isGreaterThan(lhs: WORD, rhs: WORD) {
      return chip.evalToNumber(lhs) > chip.evalToNumber(rhs) ? 1 : 0
    },
    isLessThanOrEq(lhs: WORD, rhs: WORD) {
      return chip.evalToNumber(lhs) <= chip.evalToNumber(rhs) ? 1 : 0
    },
    isGreaterThanOrEq(lhs: WORD, rhs: WORD) {
      return chip.evalToNumber(lhs) >= chip.evalToNumber(rhs) ? 1 : 0
    },
    opPlus(lhs: WORD, rhs: WORD): WORD_VALUE {
      return chip.evalToNumber(lhs) + chip.evalToNumber(rhs)
    },
    opMinus(lhs: WORD, rhs: WORD): WORD_VALUE {
      return chip.evalToNumber(lhs) - chip.evalToNumber(rhs)
    },
    opPower(lhs: WORD, rhs: WORD): WORD_VALUE {
      return Math.pow(chip.evalToNumber(lhs), chip.evalToNumber(rhs))
    },
    opMultiply(lhs: WORD, rhs: WORD): WORD_VALUE {
      return chip.evalToNumber(lhs) * chip.evalToNumber(rhs)
    },
    opDivide(lhs: WORD, rhs: WORD): WORD_VALUE {
      return chip.evalToNumber(lhs) / chip.evalToNumber(rhs)
    },
    opModDivide(lhs: WORD, rhs: WORD): WORD_VALUE {
      return chip.evalToNumber(lhs) % chip.evalToNumber(rhs)
    },
    opFloorDivide(lhs: WORD, rhs: WORD): WORD_VALUE {
      return Math.floor(chip.evalToNumber(lhs) / chip.evalToNumber(rhs))
    },
    opUniPlus(rhs: WORD): WORD_VALUE {
      return +chip.evalToNumber(rhs)
    },
    opUniMinus(rhs: WORD): WORD_VALUE {
      return -chip.evalToNumber(rhs)
    },
  }

  // create generator instance for chip
  logic = build.code?.(chip)

  return chip
}
