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
export type WORD = string | number
export type CHIP_COMMAND = (words: WORD[]) => number
export type CHIP_COMMANDS = Record<string, CHIP_COMMAND>

// lifecycle and control flow api
export type CHIP = ReturnType<typeof createChip>
export function createChip(build: GeneratorBuild) {
  // entry point state
  const labels = klona(build.labels ?? {})

  // ref to generator instance
  let logic: Generator<number> | undefined

  // incoming message state
  let message: MESSAGE | undefined = undefined

  // prevent infinite loop lockup
  let loops = 0

  // tracking for repeats
  const repeats: Record<number, number> = {}

  // pause until next tick
  let yieldState = false

  // chip values
  const values = {
    player: '',
    sender: '' as MESSAGE_SOURCE,
    data: undefined as any,
  }

  // chip invokes
  let invokes: Record<string, CHIP_COMMAND> = {}

  function invokecommand(name: string, words: WORD[]) {
    const command = invokes[name]
    if (!command) {
      throw new Error(`Unknown chip command ${name}`)
    }
    return command(words)
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
    message(incoming: MESSAGE) {
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
      return invokecommand('command', words)
    },
    if(...words: WORD[]) {
      return invokecommand('if', words)
    },
    try(...words: WORD[]) {
      return invokecommand('try', words)
    },
    take(...words: WORD[]) {
      return invokecommand('take', words)
    },
    give(...words: WORD[]) {
      return invokecommand('give', words)
    },
    while(...words: WORD[]) {
      return invokecommand('while', words)
    },
    repeatStart(index: number, ...words: WORD[]) {
      repeats[index] = invokecommand('repeat', words)
    },
    repeat(index: number) {
      const count = repeats[index] ?? 0
      repeats[index] = count - 1
      return count > 0
    },
    or(...words: WORD[]) {
      return invokecommand('or', words)
    },
    and(...words: WORD[]) {
      return invokecommand('and', words)
    },
    not(...words: WORD[]) {
      return invokecommand('not', words)
    },
    isEq(lhs: WORD, rhs: WORD) {
      return invokecommand('isEq', [lhs, rhs])
    },
    isNotEq(lhs: WORD, rhs: WORD) {
      return invokecommand('isNotEq', [lhs, rhs])
    },
    isLessThan(lhs: WORD, rhs: WORD) {
      return invokecommand('isLessThan', [lhs, rhs])
    },
    isGreaterThan(lhs: WORD, rhs: WORD) {
      return invokecommand('isGreaterThan', [lhs, rhs])
    },
    isLessThanOrEq(lhs: WORD, rhs: WORD) {
      return invokecommand('isLessThanOrEq', [lhs, rhs])
    },
    isGreaterThanOrEq(lhs: WORD, rhs: WORD) {
      return invokecommand('isGreaterThanOrEq', [lhs, rhs])
    },
    opPlus(lhs: WORD, rhs: WORD) {
      return invokecommand('opPlus', [lhs, rhs])
    },
    opMinus(lhs: WORD, rhs: WORD) {
      return invokecommand('opMinus', [lhs, rhs])
    },
    opPower(lhs: WORD, rhs: WORD) {
      return invokecommand('opPower', [lhs, rhs])
    },
    opMultiply(lhs: WORD, rhs: WORD) {
      return invokecommand('opMultiply', [lhs, rhs])
    },
    opDivide(lhs: WORD, rhs: WORD) {
      return invokecommand('opDivide', [lhs, rhs])
    },
    opModDivide(lhs: WORD, rhs: WORD) {
      return invokecommand('opModDivide', [lhs, rhs])
    },
    opFloorDivide(lhs: WORD, rhs: WORD) {
      return invokecommand('opFloorDivide', [lhs, rhs])
    },
    opUniPlus(rhs: WORD) {
      return invokecommand('opUniPlus', [rhs])
    },
    opUniMinus(rhs: WORD) {
      return invokecommand('opUniMinus', [rhs])
    },
  }

  return chip
}
