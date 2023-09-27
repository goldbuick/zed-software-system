import { klona } from 'klona/json'

import { GeneratorBuild } from './generator'

export const HALT_AT_COUNT = 32

export type EVENT = {
  to: string
  from: string | { x: number; y: number }
  name: string
  value: any
  playerId: string
}

// lifecycle and control flow api
export function createChip(build: GeneratorBuild) {
  /*

export type ObjectState = {
  labels: Record<string, number[]>
  cycle: number
  event?: EVENT
  inputs: INPUT[]
  busy: string
  yield: boolean
  paused: boolean
  locked: boolean
  completed: boolean
  code?: BrainCode
  skripto?: string
  logic?: IterableIterator<unknown>
}

  */

  const labels = klona(build.labels ?? {})
  let event: EVENT | undefined = undefined
  let loops = 0
  let yieldState = false

  return {
    begin() {
      loops = 0
      yieldState = false
    },
    shouldhalt() {
      return loops++ > HALT_AT_COUNT
    },
    hasmessage() {
      const name = event?.name ?? ''
      const result = labels[name]?.find((item) => item > 0) ?? 0
      return result
    },
    shouldyield() {
      return yieldState || this.shouldhalt()
    },
    getcase() {
      if (event) {
        const label = this.hasmessage()
        if (event.playerId) {
          // this send sets player aggro
          // coreAPI.self.values.player = event.playerId
        }
        // coreAPI.self.values.sender = event.from
        // coreAPI.self.values.data = event.value
        // coreAPI.selfState.event = undefined

        // clear event
        event = undefined
        return label
      }
      return 0
    },
    endofprogram() {
      //
    },
    stacktrace() {
      //
    },
    text() {
      //
    },
    stat() {
      //
    },
    hyperlink() {
      //
    },
    command() {
      //
    },
    if() {
      //
    },
    while() {
      //
    },
    repeatStart() {
      //
    },
    repeat() {
      //
    },
    or() {
      //
    },
    and() {
      //
    },
    not() {
      //
    },
    isEq() {
      //
    },
    isNotEq() {
      //
    },
    isLessThan() {
      //
    },
    isGreaterThan() {
      //
    },
    isLessThanOrEq() {
      //
    },
    isGreaterThanOrEq() {
      //
    },
    opPlus() {
      //
    },
    opMinus() {
      //
    },
    opPower() {
      //
    },
    opMultiply() {
      //
    },
    opDivide() {
      //
    },
    opModDivide() {
      //
    },
    opFloorDivide() {
      //
    },
    opUniPlus() {
      //
    },
    opUniMinus() {
      //
    },
  }
}

/*

hasmessage
shouldyield
getcase
endofprogram


text value
stat words
hyperlink message label
command words
if|try|take|give words
while words
repeatStart index
repeat index words
or words
and words
not words
isEq lhs rhs
isNotEq lhs rhs
isLessThan lhs rhs
isGreaterThan lhs rhs
isLessThanOrEq lhs rhs
isGreaterThanOrEq lhs rhs
opPlus rhs
opMinus rhs
opPower rhs
opMultiply rhs
opDivide rhs
opModDivide rhs
opFloorDivide rhs
opUniPlus rhs
opUniMinus rhs




*/
