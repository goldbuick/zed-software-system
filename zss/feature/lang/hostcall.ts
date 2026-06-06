import type { CHIP } from 'zss/chip'
import type { WORD } from 'zss/words/types'

/** Stable host dispatch indices — keep in sync with zss_lang_hostcall.hpp */
export const HOST = {
  SY: 0,
  GETCASE: 1,
  NEXTCASE: 2,
  JUMP: 3,
  IF: 4,
  COMMAND: 5,
  TEXT: 6,
  STAT: 7,
  HYPERLINK: 8,
  OR: 9,
  AND: 10,
  NOT: 11,
  EXPR: 12,
  IS_EQ: 13,
  IS_NOT_EQ: 14,
  IS_LESS_THAN: 15,
  IS_GREATER_THAN: 16,
  IS_LESS_THAN_OR_EQ: 17,
  IS_GREATER_THAN_OR_EQ: 18,
  OP_PLUS: 19,
  OP_MINUS: 20,
  OP_POWER: 21,
  OP_MULTIPLY: 22,
  OP_DIVIDE: 23,
  OP_MOD_DIVIDE: 24,
  OP_FLOOR_DIVIDE: 25,
  OP_UNI_PLUS: 26,
  OP_UNI_MINUS: 27,
  PRINT: 28,
  TRY: 29,
  TAKE: 30,
  GIVE: 31,
  DUPLICATE: 32,
  REPEATSTART: 33,
  REPEAT: 34,
  FOREACHSTART: 35,
  FOREACH: 36,
  WAITFOR: 37,
  API: 38,
} as const

export type HostIndex = (typeof HOST)[keyof typeof HOST]

type ArgStack = {
  i32: number[]
  f64: number[]
  str: string[]
}

function readword(stack: ArgStack): WORD {
  if (stack.i32.length) {
    return stack.i32.shift() as WORD
  }
  if (stack.f64.length) {
    return stack.f64.shift() as WORD
  }
  if (stack.str.length) {
    return stack.str.shift() as WORD
  }
  return 0
}

function readwords(stack: ArgStack): WORD[] {
  const words: WORD[] = []
  while (stack.i32.length || stack.f64.length || stack.str.length) {
    words.push(readword(stack))
  }
  return words
}

function pushword(stack: ArgStack, value: WORD) {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      stack.i32.push(value)
    } else {
      stack.f64.push(value)
    }
    return
  }
  stack.str.push(`${value ?? ''}`)
}

/** Build WASM import object backed by a CHIP instance. */
export function createhostimports(
  chip: CHIP,
  memref?: { current: WebAssembly.Memory | null },
) {
  const stack: ArgStack = { i32: [], f64: [], str: [] }

  const host = {
    push_i32(value: number) {
      stack.i32.push(value | 0)
    },
    push_f64(value: number) {
      stack.f64.push(value)
    },
    push_str(ptr: number, len: number) {
      const memory = memref?.current
      if (memory) {
        const view = new Uint8Array(memory.buffer, ptr, len)
        stack.str.push(new TextDecoder().decode(view))
      } else {
        stack.str.push('')
      }
    },
    call(index: number): number {
      switch (index) {
        case HOST.SY:
          return chip.sy() ? 1 : 0
        case HOST.GETCASE:
          return chip.getcase()
        case HOST.NEXTCASE:
          chip.nextcase()
          return 0
        case HOST.JUMP:
          chip.jump(readword(stack) as number)
          return 0
        case HOST.IF:
          return maptoresult(chip.if(...readwords(stack)))
        case HOST.COMMAND:
          return chip.command(...readwords(stack)) ? 1 : 0
        case HOST.TEXT:
          chip.text(readword(stack))
          return 0
        case HOST.STAT:
          chip.stat(...readwords(stack))
          return 0
        case HOST.HYPERLINK: {
          const text = readword(stack)
          chip.hyperlink(text, ...readwords(stack))
          return 0
        }
        case HOST.OR:
          return maptoresult(chip.or(...readwords(stack)))
        case HOST.AND:
          return maptoresult(chip.and(...readwords(stack)))
        case HOST.NOT:
          return maptoresult(chip.not(...readwords(stack)))
        case HOST.EXPR:
          return maptoresult(chip.expr(readword(stack)))
        case HOST.IS_EQ:
          return maptoresult(chip.isEq(readword(stack), readword(stack)))
        case HOST.IS_NOT_EQ:
          return maptoresult(chip.isNotEq(readword(stack), readword(stack)))
        case HOST.IS_LESS_THAN:
          return maptoresult(chip.isLessThan(readword(stack), readword(stack)))
        case HOST.IS_GREATER_THAN:
          return maptoresult(
            chip.isGreaterThan(readword(stack), readword(stack)),
          )
        case HOST.IS_LESS_THAN_OR_EQ:
          return maptoresult(
            chip.isLessThanOrEq(readword(stack), readword(stack)),
          )
        case HOST.IS_GREATER_THAN_OR_EQ:
          return maptoresult(
            chip.isGreaterThanOrEq(readword(stack), readword(stack)),
          )
        case HOST.OP_PLUS:
          pushword(stack, chip.opPlus(readword(stack), readword(stack)))
          return 0
        case HOST.OP_MINUS:
          pushword(stack, chip.opMinus(readword(stack), readword(stack)))
          return 0
        case HOST.OP_POWER:
          pushword(stack, chip.opPower(readword(stack), readword(stack)))
          return 0
        case HOST.OP_MULTIPLY:
          pushword(stack, chip.opMultiply(readword(stack), readword(stack)))
          return 0
        case HOST.OP_DIVIDE:
          pushword(stack, chip.opDivide(readword(stack), readword(stack)))
          return 0
        case HOST.OP_MOD_DIVIDE:
          pushword(stack, chip.opModDivide(readword(stack), readword(stack)))
          return 0
        case HOST.OP_FLOOR_DIVIDE:
          pushword(stack, chip.opFloorDivide(readword(stack), readword(stack)))
          return 0
        case HOST.OP_UNI_PLUS:
          pushword(stack, chip.opUniPlus(readword(stack)))
          return 0
        case HOST.OP_UNI_MINUS:
          pushword(stack, chip.opUniMinus(readword(stack)))
          return 0
        case HOST.PRINT:
          pushword(stack, chip.print(`${readword(stack)}`))
          return 0
        case HOST.TRY:
          return chip.try(...readwords(stack)) ? 1 : 0
        case HOST.TAKE:
          return chip.take(...readwords(stack)) ? 1 : 0
        case HOST.GIVE:
          return chip.give(...readwords(stack)) ? 1 : 0
        case HOST.DUPLICATE:
          return chip.duplicate(...readwords(stack)) ? 1 : 0
        case HOST.REPEATSTART:
          chip.repeatstart(readword(stack) as number, ...readwords(stack))
          return 0
        case HOST.REPEAT:
          return chip.repeat(readword(stack) as number) ? 1 : 0
        case HOST.FOREACHSTART:
          return chip.foreachstart(
            readword(stack) as number,
            ...readwords(stack),
          )
            ? 1
            : 0
        case HOST.FOREACH:
          return chip.foreach(readword(stack) as number, ...readwords(stack))
            ? 1
            : 0
        case HOST.WAITFOR:
          return chip.waitfor(...readwords(stack)) ? 1 : 0
        case HOST.API: {
          const method = `${readword(stack)}`
          const words = readwords(stack)
          const fn = (chip as Record<string, (...args: WORD[]) => unknown>)[
            method
          ]
          if (typeof fn === 'function') {
            const result = fn.apply(chip, words)
            if (typeof result === 'number') {
              return result ? 1 : 0
            }
          }
          return 0
        }
        default:
          return 0
      }
    },
  }

  return { host }
}

function maptoresult(value: WORD): number {
  if (Array.isArray(value)) {
    return value.length > 0 ? 1 : 0
  }
  return value ? 1 : 0
}
