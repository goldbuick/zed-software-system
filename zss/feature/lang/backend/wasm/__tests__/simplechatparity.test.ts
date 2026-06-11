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

import { createchip } from 'zss/chip'
import { compile } from 'zss/feature/lang'
import { readcorpus } from 'zss/feature/lang/backend/wasm/corpus'
import {
  compilecppfromdisk,
  wasmartifactspresent,
} from 'zss/feature/lang/backend/wasm/langparityload'
import { DRIVER_TYPE } from 'zss/firmware/runner'

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

const hasartifacts = wasmartifactspresent()
const describeartifacts = hasartifacts ? describe : describe.skip

describe('simple_chat_player TS oracle vs C++ labels', () => {
  const source = readcorpus('integration', 'simple_chat_player')

  it('TS compiles without errors', () => {
    const jsbuild = compile('player', source)
    expect(jsbuild.errors ?? []).toHaveLength(0)
    expect(Object.keys(jsbuild.labels ?? {}).length).toBeGreaterThan(0)
    expect(jsbuild.labels?.think).toBeDefined()
  })
})

describeartifacts('simple_chat_player runtime with C++ labels only', () => {
  const source = readcorpus('integration', 'simple_chat_player')

  it('wasm chip matches TS after once() using cpp labels', () => {
    const jsbuild = compile('player', source)
    const cpp = compilecppfromdisk('player', source)
    const cpplabels = labelsfromjson(cpp.labelsjson)

    const wasmbuild = {
      errors: cpp.errors,
      wasmbytes: cpp.wasmbytes,
      labels: cpplabels,
      code: undefined,
    }
    const jschip = createchip('js-chat', DRIVER_TYPE.RUNTIME, jsbuild)
    const wasmchip = createchip('wasm-chat', DRIVER_TYPE.RUNTIME, wasmbuild)

    jschip.once()
    wasmchip.once()

    expect(wasmchip.isended()).toBe(jschip.isended())
    expect(wasmchip.getcase()).toBe(jschip.getcase())
  }, 20000)
})
