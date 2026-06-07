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

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { type CHIP, createchip } from 'zss/chip'
import { compile } from 'zss/feature/lang'
import {
  readfixture,
} from 'zss/feature/lang/backend/wasm/langparityload'
import {
  compilenativewasmfortest,
  runnativeparitygatefortest,
} from 'zss/feature/lang/backend/wasm/testhelpers/nativewasmtestutil'
import { loadscriptsync } from 'zss/feature/lang/wasmloader'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import type { WORD } from 'zss/words/types'

const FIXTUREDIR = path.join(__dirname, 'fixtures')

function readlocalfixture(name: string) {
  return readFileSync(path.join(FIXTUREDIR, name), 'utf8')
}

describe('lang native wasm parity gate', () => {
  it('native compiler emits wasm magic for all fixtures', () => {
    const output = runnativeparitygatefortest()
    expect(output).toContain('fail=0')
  })
})

describe('lang wasm behavioral parity', () => {
  const FIXTURES = [
    'empty',
    'if_break',
    'while_break',
    'repeat_break',
    'short_go',
    'short_try',
    'divide',
    'paren_multiline',
    'pick',
    'comparison_chain',
    'label_goto',
    'stat_line',
    'text_line',
    'command',
    'foreach',
    'while_push_by',
    'duplicate_fork',
    'send_dir_label',
    'paren_intround',
  ] as const

  it.each(FIXTURES)('%s wasm run matches JS oracle', (id) => {
    const source = readfixture(id, 'zss')
    const jsbuild = compile(id, source)
    const wasmbytes = compilenativewasmfortest(source)

    expect(wasmbytes[0]).toBe(0x00)
    expect(wasmbytes[1]).toBe(0x61)
    expect(wasmbytes[2]).toBe(0x73)
    expect(wasmbytes[3]).toBe(0x6d)

    const jschip = createchip(`js-${id}`, DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmbuild = {
      ...jsbuild,
      wasmbytes,
      code: undefined,
    }
    const wasmchip = createchip(`wasm-${id}`, DRIVER_TYPE.RUNTIME, wasmbuild)

    jschip.once()
    wasmchip.once()

    expect(wasmchip.isended()).toBe(jschip.isended())
  })

  it('switch break runs all cases before end on stat_line', () => {
    const source = readfixture('stat_line', 'zss')
    const jsbuild = compile('stat_line', source)
    const wasmbytes = compilenativewasmfortest(source)
    const wasmbuild = {
      ...jsbuild,
      wasmbytes,
      code: undefined,
    }

    const jschip = createchip('js-stat', DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip('wasm-stat', DRIVER_TYPE.RUNTIME, wasmbuild)

    jschip.once()
    wasmchip.once()

    expect(wasmchip.isended()).toBe(jschip.isended())
    expect(wasmchip.getcase()).toBe(jschip.getcase())
  })

  it('stub player think loop matches JS oracle', () => {
    const source = `@player
@char 2
@color blue
@cycle 1
:think
"
"Stub World
#if inputmove do ?inputmove
#else idle
#done
#think
`
    const jsbuild = compile('player', source)
    const wasmbytes = compilenativewasmfortest(source)
    expect(wasmbytes.length).toBeGreaterThan(8)
    const wasmbuild = {
      ...jsbuild,
      wasmbytes,
      code: undefined,
    }

    const jschip = createchip('js-player', DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip('wasm-player', DRIVER_TYPE.RUNTIME, wasmbuild)

    jschip.once()
    wasmchip.once()

    expect(wasmchip.isended()).toBe(jschip.isended())
    expect(wasmchip.getcase()).toBe(jschip.getcase())
  })

  it('command retry keeps execution cursor on short_go', () => {
    const source = readfixture('short_go', 'zss')
    const jsbuild = compile('short_go', source)
    const wasmbytes = compilenativewasmfortest(source)
    const wasmbuild = {
      ...jsbuild,
      wasmbytes,
      code: undefined,
    }

    const jschip = createchip('js-retry', DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip('wasm-retry', DRIVER_TYPE.RUNTIME, wasmbuild)

    const stubcommand = (chip: typeof jschip) => {
      chip.command = () => {
        chip.yield()
        return 1
      }
    }
    stubcommand(jschip)
    stubcommand(wasmchip)

    jschip.once()
    wasmchip.once()

    expect(wasmchip.isended()).toBe(jschip.isended())
    expect(wasmchip.getcase()).toBe(jschip.getcase())
    expect(wasmchip.isended()).toBe(false)
    expect(wasmchip.getcase()).not.toBe(3)
  })

  it('compiles simple chat player script to wasm', () => {
    const source = readlocalfixture('simple_chat_player.zss')
    const wasmbytes = compilenativewasmfortest(source)
    expect(wasmbytes[0]).toBe(0x00)
    expect(wasmbytes[1]).toBe(0x61)
    expect(wasmbytes[2]).toBe(0x73)
    expect(wasmbytes[3]).toBe(0x6d)
    expect(wasmbytes.length).toBeGreaterThan(1000)
  })

  it('compiles nested elseif chain to wasm', () => {
    const source = readlocalfixture('elseif_chain_nested.zss')
    const wasmbytes = compilenativewasmfortest(source)
    expect(wasmbytes.length).toBeGreaterThan(8)
  })

  it('compiles take/else inside if/elseif to wasm', () => {
    const source = readlocalfixture('take_else_in_elseif.zss')
    const wasmbytes = compilenativewasmfortest(source)
    expect(wasmbytes.length).toBeGreaterThan(8)
  })

  it('quoted text lines omit syntax marker in sidebar queue', () => {
    const source = readlocalfixture('quoted_text_lines.zss')
    const jsbuild = compile('quoted_text_lines', source)
    expect(jsbuild.errors ?? []).toHaveLength(0)
    expect(jsbuild.source).toContain("api.text('Simple $9 $9 $9')")
    expect(jsbuild.source).not.toContain('api.text(\'"Simple')

    const wasmbytes = compilenativewasmfortest(source)
    const wasmliterals = new TextDecoder('utf-8', { fatal: false }).decode(
      wasmbytes,
    )
    expect(wasmliterals.includes('"Simple $9 $9 $9')).toBe(false)
    expect(wasmliterals.includes('Simple $9 $9 $9')).toBe(true)
    expect(wasmliterals.includes('"press $whiteC$yellow to chat')).toBe(false)
    expect(wasmliterals.includes('press $whiteC$yellow to chat')).toBe(true)
  })

  it('flicker lantern sets light via pick with mixed command args', () => {
    const source = readlocalfixture('flicker_lantern.zss')
    expect(compilenativewasmfortest(source).length).toBeGreaterThan(8)

    const minimal = '#set light pick 5 7 11 12\n'
    const wasmbytes = compilenativewasmfortest(minimal)
    const invoked: WORD[][] = []
    let ec = 1
    const chip = {
      sy: () => false,
      getcase: () => ec,
      nextcase: () => {
        ec++
      },
      jump: (line: number) => {
        ec = line
      },
      command(...words: WORD[]) {
        invoked.push(words)
        return 0
      },
    } as unknown as CHIP

    loadscriptsync(wasmbytes, chip).run()

    expect(invoked).toEqual([['set', 'light', 'pick', 5, 7, 11, 12]])
  })

  const BOOKFIXTUREDIR = path.join(__dirname, 'fixtures/coolregionsbow')

  function readbookfixture(id: string) {
    return readFileSync(path.join(BOOKFIXTUREDIR, `${id}.zss`), 'utf8')
  }

  it.each(['clockwise', 'counter', 'duplicator', 'line'] as const)(
    'coolregionsbow %s wasm run matches JS oracle',
    (id) => {
      const source = readbookfixture(id)
      const jsbuild = compile(id, source)
      const wasmbytes = compilenativewasmfortest(source)
      const wasmbuild = {
        ...jsbuild,
        wasmbytes,
        code: undefined,
      }

      const jschip = createchip(`js-${id}`, DRIVER_TYPE.RUNTIME, jsbuild)
      const wasmchip = createchip(`wasm-${id}`, DRIVER_TYPE.RUNTIME, wasmbuild)

      jschip.once()
      wasmchip.once()

      expect(wasmchip.isended()).toBe(jschip.isended())
      expect(wasmchip.getcase()).toBe(jschip.getcase())
    },
  )
})
