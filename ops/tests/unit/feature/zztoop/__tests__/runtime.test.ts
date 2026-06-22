/* eslint-disable @typescript-eslint/no-implied-eval */
jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  WASM_SCRIPT: false,
}))

import { compileast as langcompileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'
import { compilezztoop } from 'zss/feature/zztoop/compile'

// Up to this point every zztoop test asserts on the emitted *source string*. That
// proves the shape of the generated code but never proves it *runs* like ZZT. This
// suite actually executes the compiled `(api) => 0|1` function on a hand-built chip
// that faithfully mirrors the two pieces of the real runtime the lowering depends
// on:
//
//   1. chip.once() loop (zss/chip.ts): while(true){ if(sy())return 1; switch(getcase()){...}; nextcase() }
//      - sy() yields when the `ys` flag is set (or a safety loop-count trips)
//      - getcase()/nextcase() walk the execution cursor `ec`
//      - jump(line) sets `ec`
//   2. the `go` firmware (zss/firmware/element.ts):
//      - ALWAYS calls chip.yield()  -> one move per tick
//      - returns 1 when blocked (retry), 0 when it moved
//
// One call to build.code(api) == one tick (one chip.once()). We reset the per-tick
// state, run the function, and record which commands fired on that tick.

type CALL = { name: string; args: unknown[] }

type BLOCKED = (name: string, args: unknown[], count: number) => boolean

function createtestchip(blocked?: BLOCKED) {
  let ec = 1
  let ys = 0
  let lc = 0
  let ended = false
  let tickcalls: CALL[] = []
  const counts: Record<string, number> = {}

  const api = {
    // --- chip.once() loop contract ---
    sy() {
      lc += 1
      if (lc > 5000) {
        return true
      }
      return ys === 1
    },
    getcase() {
      return ec
    },
    nextcase() {
      ec += 1
      return ec
    },
    jump(line: number) {
      ec = line
    },
    yield() {
      ys = 1
    },
    endofprogram() {
      ys = 1
      ended = true
    },
    stacktrace() {
      return { line: 0, column: 0 }
    },

    // --- logic api the generated movement/command code can touch ---
    command(...words: unknown[]): 0 | 1 {
      if (words.length === 0) {
        return 0
      }
      const [name, ...args] = words
      const cmd = String(name).toLowerCase()
      tickcalls.push({ name: cmd, args })

      if (cmd === 'end') {
        api.endofprogram()
        return 0
      }
      if (cmd === 'go' || cmd === 'try' || cmd === 'walk') {
        // mirror element.ts: always yield (one move per tick)
        api.yield()
        const key = `${cmd}:${args.join(',')}`
        counts[key] = (counts[key] ?? 0) + 1
        const isblocked = blocked ? blocked(cmd, args, counts[key]) : false
        return isblocked ? 1 : 0
      }
      // generic commands proceed (return 0 == no retry)
      return 0
    },
    if(...words: unknown[]) {
      tickcalls.push({ name: 'if', args: words })
      return false
    },

    // stubs for anything else a program might emit
    stat() {
      return 0
    },
    text() {
      return 0
    },
    hyperlink() {
      return 0
    },
    lock() {},
    unlock() {},
    send() {},
    zap() {},
    restore() {},
  }

  return {
    api,
    isended() {
      return ended
    },
    begintick() {
      ys = 0
      lc = 0
      tickcalls = []
    },
    taketick() {
      return tickcalls
    },
  }
}

// run build.code one tick at a time, recording the commands fired each tick.
function runticks(
  code: (api: any) => 0 | 1,
  blocked?: BLOCKED,
  maxticks = 64,
): CALL[][] {
  const chip = createtestchip(blocked)
  const ticks: CALL[][] = []
  for (let t = 0; t < maxticks; t += 1) {
    if (chip.isended()) {
      break
    }
    chip.begintick()
    const result = code(chip.api)
    const calls = chip.taketick()
    if (calls.length > 0) {
      ticks.push(calls)
    }
    // returning 0 means the switch hit `default` (ran off the end) == program done
    if (result === 0) {
      break
    }
  }
  return ticks
}

function zztoopcode(src: string): (api: any) => 0 | 1 {
  const build = compilezztoop('test', src)
  expect(build.errors ?? []).toEqual([])
  expect(build.code).toBeDefined()
  return build.code!
}

function langcode(src: string): (api: any) => 0 | 1 {
  const result = langcompileast(src)
  expect(result.errors ?? []).toEqual([])
  expect(result.ast).toBeDefined()
  const transformed = transformast(result.ast!)
  // eslint-disable-next-line no-new-func
  return new Function('api', transformed.code ?? ' ') as (api: any) => 0 | 1
}

// flatten the tick log to a compact, comparable shape
function shape(ticks: CALL[][]): string[][] {
  return ticks.map((tick) =>
    tick.map((call) => `${call.name}(${call.args.join(',')})`),
  )
}

describe('zztoop runtime: one move per tick', () => {
  it('?n?n?n runs exactly three moves, one per tick', () => {
    const ticks = shape(runticks(zztoopcode('?n?n?n\n')))
    expect(ticks).toEqual([['go(n)'], ['go(n)'], ['go(n)']])
  })

  it('/n/e/s/w runs four blocking moves, one per tick (none blocked)', () => {
    const ticks = shape(runticks(zztoopcode('/n/e/s/w\n')))
    expect(ticks).toEqual([['go(n)'], ['go(e)'], ['go(s)'], ['go(w)']])
  })

  it('?cw n keeps the cw modifier on the single move', () => {
    const ticks = shape(runticks(zztoopcode('?cw n\n')))
    expect(ticks).toEqual([['go(cw,n)']])
  })
})

describe('zztoop runtime: blocking vs non-blocking', () => {
  // /i is #go: when blocked it retries the SAME move on later ticks.
  it('/i retries while blocked, then proceeds once it moves', () => {
    const blockfirsttwo: BLOCKED = (name, _args, count) =>
      name === 'go' && count <= 2
    const ticks = shape(runticks(zztoopcode('/i#char 53\n'), blockfirsttwo))
    expect(ticks).toEqual([
      ['go(i)'], // tick 1: blocked, retry
      ['go(i)'], // tick 2: blocked, retry
      ['go(i)'], // tick 3: moved
      ['char(53)'], // tick 4: inline command runs the tick after the move
    ])
  })

  // ?i is #try: when blocked it gives up and moves on the very next tick.
  it('?i does NOT retry when blocked (gives up immediately)', () => {
    const alwaysblocked: BLOCKED = (name) => name === 'go'
    const ticks = shape(runticks(zztoopcode('?i#char 53\n'), alwaysblocked))
    expect(ticks).toEqual([
      ['go(i)'], // tick 1: blocked but #try moves on anyway
      ['char(53)'], // tick 2: inline command still runs
    ])
  })
})

describe('zztoop runtime: inline command after move', () => {
  it('?n#send label runs the move first, the send on the next tick', () => {
    const ticks = shape(runticks(zztoopcode('?n#send label\n')))
    expect(ticks).toEqual([['go(n)'], ['send(label)']])
  })

  it('?n?n#send label runs both moves, then the send', () => {
    const ticks = shape(runticks(zztoopcode('?n?n#send label\n')))
    expect(ticks).toEqual([['go(n)'], ['go(n)'], ['send(label)']])
  })
})

// Strongest cross-check: execute the SAME program through the independently built,
// production lang parser and assert the tick-by-tick runtime behavior is identical.
describe('zztoop vs lang runtime parity', () => {
  const cases: { src: string; blocked?: BLOCKED }[] = [
    { src: '?n?n?n\n' },
    { src: '/n/e/s/w\n' },
    { src: '?cw n\n' },
    { src: '?n#send label\n' },
    { src: '/i#char 53\n', blocked: (n, _a, c) => n === 'go' && c <= 2 },
    { src: '?i#char 53\n', blocked: (n) => n === 'go' },
    { src: '?n?n#send label\n' },
  ]
  for (const { src, blocked } of cases) {
    it(`runs ${JSON.stringify(src.trim())} identically on both backends`, () => {
      const zss = shape(runticks(zztoopcode(src), blocked))
      const lang = shape(runticks(langcode(src), blocked))
      expect(zss).toEqual(lang)
    })
  }
})
