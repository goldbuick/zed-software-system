jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { MEMORY_WASM_FIXTURES_DIR } from 'ops/lib/fixturepaths'

const MEMORYDIR = path.join(__dirname, '..')
const FIXTUREDIR = MEMORY_WASM_FIXTURES_DIR
const PARITYBIN = path.join(MEMORYDIR, 'zss_memory_parity')
const SRC = path.join(MEMORYDIR, 'zss_memory.cpp')

function ensurenativeparitybinary() {
  execFileSync(
    'g++',
    [
      '-std=c++14',
      '-O2',
      '-I',
      MEMORYDIR,
      '-DJSON_NOEXCEPTION',
      '-DZSS_MEMORY_PARITY_MAIN',
      '-o',
      PARITYBIN,
      SRC,
    ],
    { stdio: 'pipe' },
  )
}

describe('memory native parity gate', () => {
  it('native zss_memory passes all fixtures', () => {
    ensurenativeparitybinary()
    const output = execFileSync(PARITYBIN, [FIXTUREDIR], { encoding: 'utf8' })
    expect(output).toContain('fail=0')
  })
})
