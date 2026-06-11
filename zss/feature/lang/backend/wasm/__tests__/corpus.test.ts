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

import { createchip } from 'zss/chip'
import { compile } from 'zss/feature/lang'
import {
  allcorpusids,
  bookids,
  integrationids,
  iswasmmagic,
  parityids,
  readcorpus,
} from 'zss/feature/lang/backend/wasm/corpus'
import { compilecppfromdisk } from 'zss/feature/lang/backend/wasm/langparityload'
import { compilenativewasmfortest } from 'zss/feature/lang/backend/wasm/testhelpers/nativewasmtestutil'
import { DRIVER_TYPE } from 'zss/firmware/runner'
import { readcoolregionsbowbookexport } from 'zss/testsupport/coolregionsbowbook'

function labelsfromjson(labelsjson: string) {
  if (!labelsjson.trim()) {
    return {}
  }
  try {
    return JSON.parse(labelsjson) as Record<string, number[]>
  } catch {
    return {}
  }
}

function wasmbuildfromcpp(source: string, name: string) {
  const cpp = compilecppfromdisk(name, source)
  return {
    errors: cpp.errors,
    wasmbytes: cpp.wasmbytes,
    labels: labelsfromjson(cpp.labelsjson),
    code: undefined,
  }
}

describe('lang corpus manifests', () => {
  it('lists parity micro-fixtures', () => {
    expect(parityids()).toContain('if_break')
    expect(parityids()).toContain('comparison_chain')
    expect(parityids().length).toBeGreaterThanOrEqual(19)
  })

  it('lists integration scripts', () => {
    expect(integrationids()).toContain('simple_chat_player')
    expect(integrationids()).toContain('quoted_text_lines')
  })

  it('lists coolregionsbow book scripts', () => {
    expect(bookids()).toContain('player')
    expect(bookids()).toContain('clockwise')
    expect(bookids().length).toBeGreaterThanOrEqual(50)
  })

  it('book corpus shares sim fixture json path', () => {
    expect(readcoolregionsbowbookexport().data.name).toBe('coolregionsbow')
  })

  it('every manifest entry has a .zss file', () => {
    for (const { tier, id } of allcorpusids()) {
      expect(() => readcorpus(tier, id)).not.toThrow()
      expect(readcorpus(tier, id).length).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('lang corpus native wasm compile', () => {
  it.each(parityids())('parity %s compiles to wasm', (id) => {
    const wasmbytes = compilenativewasmfortest(readcorpus('parity', id))
    expect(iswasmmagic(wasmbytes)).toBe(true)
  })

  it.each(integrationids())(
    'integration %s compiles to wasm',
    (id) => {
      const wasmbytes = compilenativewasmfortest(readcorpus('integration', id))
      expect(iswasmmagic(wasmbytes)).toBe(true)
    },
    15000,
  )

  it.each(bookids())(
    'book %s compiles to wasm',
    (id) => {
      const wasmbytes = compilenativewasmfortest(readcorpus('book', id))
      expect(iswasmmagic(wasmbytes)).toBe(true)
    },
    15000,
  )
})

describe('lang corpus behavioral parity (native wasm vs TS oracle)', () => {
  const PARITY_BEHAVIOR = parityids()

  it.each(PARITY_BEHAVIOR)('parity %s wasm run matches JS', (id) => {
    const source = readcorpus('parity', id)
    const jsbuild = compile(id, source)
    const wasmbytes = compilenativewasmfortest(source)
    const wasmbuild = { ...jsbuild, wasmbytes, code: undefined }
    const jschip = createchip(`js-${id}`, DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip(`wasm-${id}`, DRIVER_TYPE.RUNTIME, wasmbuild)
    jschip.once()
    wasmchip.once()
    expect(wasmchip.isended()).toBe(jschip.isended())
  })

  it('simple_chat_player wasm run matches JS oracle', () => {
    const source = readcorpus('integration', 'simple_chat_player')
    const jsbuild = compile('player', source)
    expect(jsbuild.errors ?? []).toHaveLength(0)
    const wasmbuild = wasmbuildfromcpp(source, 'player')
    const jschip = createchip('js-chat', DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip('wasm-chat', DRIVER_TYPE.RUNTIME, wasmbuild)
    jschip.once()
    wasmchip.once()
    expect(wasmchip.isended()).toBe(jschip.isended())
    expect(wasmchip.getcase()).toBe(jschip.getcase())
  }, 15000)

  it('simple_chat_player wasm reaches #clear key0 without reader crash', () => {
    const source = readcorpus('integration', 'simple_chat_player')
    const jsbuild = compile('player', source)
    const wasmbytes = compilenativewasmfortest(source)
    const wasmbuild = { ...jsbuild, wasmbytes, code: undefined }
    const wasmchip = createchip('wasm-clear-key0', DRIVER_TYPE.RUNTIME, wasmbuild)
    expect(() => wasmchip.once()).not.toThrow()
  }, 15000)

  const BOOK_BEHAVIOR = ['clockwise', 'counter', 'duplicator', 'line'] as const

  it.each(BOOK_BEHAVIOR)('book %s wasm run matches JS', (id) => {
    const source = readcorpus('book', id)
    const jsbuild = compile(id, source)
    const wasmbytes = compilenativewasmfortest(source)
    const wasmbuild = { ...jsbuild, wasmbytes, code: undefined }
    const jschip = createchip(`js-${id}`, DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip(`wasm-${id}`, DRIVER_TYPE.RUNTIME, wasmbuild)
    jschip.once()
    wasmchip.once()
    expect(wasmchip.isended()).toBe(jschip.isended())
    expect(wasmchip.getcase()).toBe(jschip.getcase())
  })
})
