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

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { compile } from 'zss/feature/lang'
import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'
import { readcorpus } from 'zss/feature/lang/backend/wasm/corpus'
import {
  compilecppfromdisk,
  wasmartifactspresent,
} from 'zss/feature/lang/backend/wasm/langparityload'
import { LANG_INTEGRATION_GOLDENS_DIR } from 'zss/testsupport/fixturepaths'

const GOLDENDIR = LANG_INTEGRATION_GOLDENS_DIR
const hasartifacts = wasmartifactspresent()
const describeartifacts = hasartifacts ? describe : describe.skip

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

describe('simple_chat_player TS oracle snapshot', () => {
  const source = readcorpus('integration', 'simple_chat_player')

  it('TS compiles without errors', () => {
    const jsbuild = compile('player', source)
    expect(jsbuild.errors ?? []).toHaveLength(0)
    expect(Object.keys(jsbuild.labels ?? {}).length).toBeGreaterThan(0)
    expect(jsbuild.labels?.think).toEqual([31])
  })
})

describeartifacts('simple_chat_player integration golden', () => {
  const source = readcorpus('integration', 'simple_chat_player')

  it('writes TS oracle artifacts when REGEN_LANG_INTEGRATION=1', () => {
    if (process.env.REGEN_LANG_INTEGRATION !== '1') {
      return
    }
    mkdirSync(GOLDENDIR, { recursive: true })
    const ast = compileast(source)
    const out = transformast(ast.ast!)
    writeFileSync(
      path.join(GOLDENDIR, 'simple_chat_player.js'),
      out.code ?? '',
      'utf8',
    )
    writeFileSync(
      path.join(GOLDENDIR, 'simple_chat_player.labels.json'),
      `${JSON.stringify(out.labels ?? {}, null, 2)}\n`,
    )
    writeFileSync(
      path.join(GOLDENDIR, 'simple_chat_player.diag.json'),
      `${JSON.stringify({ errors: ast.errors ?? [], tokencount: ast.tokens?.length ?? 0 }, null, 2)}\n`,
    )
  })

  it('C++ labelsjson and line count match TS oracle within one case', () => {
    const jsbuild = compile('player', source)
    const ast = compileast(source)
    const out = transformast(ast.ast!)
    const cpp = compilecppfromdisk('player', source)
    expect(cpp.errors).toHaveLength(0)
    const cpplabels = labelsfromjson(cpp.labelsjson)
    const tscount = (out.code.match(/case \d+:/g) ?? []).length
    const cppcount = Object.keys(JSON.parse(cpp.debugmap).cases).length
    expect(Math.abs(cppcount - tscount)).toBeLessThanOrEqual(1)
    expect(cpplabels.think).toEqual([31])
    expect(cpplabels.shot).toEqual(jsbuild.labels?.shot)
    expect(cpplabels.think).toEqual(out.labels?.think)
  })
})
