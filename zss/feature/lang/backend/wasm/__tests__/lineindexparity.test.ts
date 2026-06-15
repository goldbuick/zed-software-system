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

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compile } from 'zss/feature/lang'
import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'
import { compilecppfromdisk } from 'zss/feature/lang/backend/wasm/langparityload'
import { LANG_SCRIPTS_DIR } from 'zss/testsupport/fixturepaths'

const FIXTUREDIR = LANG_SCRIPTS_DIR

function casecount(code: string) {
  return (code.match(/case \d+:/g) ?? []).length
}

/** Targeted regressions for C++ line-index drift vs TS oracle. */
describe('line index parity probes', () => {
  it.each([
    'else_inline_set',
    'elseif_chain_flat',
    'quoted_text_lines',
    'else_if_then_else_take',
    'minimal_else_take',
    'shot_take_else',
    'simple_chat_setup',
    'hint_hotkeys_tail',
    'player_update_code',
    'graphics_fpv_block',
    'quote_then_hyperlink',
    'mute_else_idle',
    'mute_else_do',
    'mute_text_block',
    'mute_hyperlink_block',
    'hint_mute_nested',
    'hint_else_sidebar',
    'inline_if_set',
    'torch_wick_block',
    'wick_nested_inline_else',
  ])('%s TS and C++ case counts match', (id) => {
    const source = readFileSync(path.join(FIXTUREDIR, `${id}.zss`), 'utf8')
    const js = compile(id, source)
    const out = transformast(compileast(source).ast!)
    const cpp = compilecppfromdisk(id, source)
    const debug = JSON.parse(cpp.debugmap) as { cases: Record<string, unknown> }
    const tscount = casecount(out.code)
    const cppcount = Object.keys(debug.cases).length
    expect(cpp.errors).toHaveLength(0)
    expect(js.errors ?? []).toHaveLength(0)
    expect(cppcount).toBe(tscount)
    expect(JSON.parse(cpp.labelsjson)).toEqual(js.labels)
  })
})

describe('line index parity known gaps', () => {
  it.todo('#else take after #else if with block bodies — one extra LINE in C++')
})
