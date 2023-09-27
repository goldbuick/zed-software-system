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

export type WORD = string | number

// lifecycle and control flow api
export function createChip(build: GeneratorBuild, firmware: any) {
  // entry point state
  const labels = klona(build.labels ?? {})

  // incoming message state
  let message: MESSAGE | undefined = undefined

  // prevent infinite loop lockup
  let loops = 0

  // pause until next tick
  let yieldState = false

  // chip values
  const values = {
    player: '',
    sender: '' as MESSAGE_SOURCE,
    data: undefined as any,
  }

  const chip = {
    // lifecycle api
    begin() {
      loops = 0
      yieldState = false
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
      // should these be rolled into #commands ?
      // thus having a single DSL to describe commands ?
      // ie: like the default lib for objects etc..
      // hmm because of try / take / give etc..
      // I think defining a firmware layer that covers
      // all these core invokes
    },
    stat(words: WORD[]) {
      //
    },
    hyperlink(message: string, label: string) {
      //
    },
    command(words: WORD[]) {
      //
    },
    if(words: WORD[]) {
      //
    },
    try(words: WORD[]) {
      //
    },
    take(words: WORD[]) {
      //
    },
    give(words: WORD[]) {
      //
    },
    while(words: WORD[]) {
      //
    },
    repeatStart(index: number) {
      //
    },
    repeat(index: number, words: WORD) {
      //
    },
    or(words: WORD[]) {
      //
    },
    and(words: WORD[]) {
      //
    },
    not(words: WORD[]) {
      //
    },
    isEq(lhs: WORD, rhs: WORD) {
      //
    },
    isNotEq(lhs: WORD, rhs: WORD) {
      //
    },
    isLessThan(lhs: WORD, rhs: WORD) {
      //
    },
    isGreaterThan(lhs: WORD, rhs: WORD) {
      //
    },
    isLessThanOrEq(lhs: WORD, rhs: WORD) {
      //
    },
    isGreaterThanOrEq(lhs: WORD, rhs: WORD) {
      //
    },
    opPlus(lhs: WORD, rhs: WORD) {
      //
    },
    opMinus(lhs: WORD, rhs: WORD) {
      //
    },
    opPower(lhs: WORD, rhs: WORD) {
      //
    },
    opMultiply(lhs: WORD, rhs: WORD) {
      //
    },
    opDivide(lhs: WORD, rhs: WORD) {
      //
    },
    opModDivide(lhs: WORD, rhs: WORD) {
      //
    },
    opFloorDivide(lhs: WORD, rhs: WORD) {
      //
    },
    opUniPlus(rhs: WORD) {
      //
    },
    opUniMinus(rhs: WORD) {
      //
    },
  }

  return chip
}
